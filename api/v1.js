// File: api/v1.js
import { createServer } from 'node:https';
import { get } from 'node:https';
import { parse } from 'url';

export default async function handler(req, res) {
  const { query } = parse(req.url, true);
  const ip = query.ip;
  const port = query.port;

  if (!ip || !port) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Missing ip or port parameter' }));
    return;
  }

  try {
    const result = await checkProxy(ip, port);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  } catch (error) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: error.message }));
  }
}

function checkProxy(ip, port) {
  const host = 'speed.cloudflare.com';
  const path = '/meta';
  const payload = `GET ${path} HTTP/1.1\r\nHost: ${host}\r\nUser-Agent: Mozilla/5.0\r\nConnection: close\r\n\r\n`;

  return new Promise((resolve, reject) => {
    const tls = require('tls');
    const net = require('net');

    const socket = net.connect({ host: ip, port: parseInt(port) }, () => {
      const secureSocket = tls.connect({
        socket,
        servername: host,
        rejectUnauthorized: false
      }, () => {
        secureSocket.write(payload);
      });

      let data = '';

      secureSocket.on('data', chunk => {
        data += chunk.toString();
      });

      secureSocket.on('end', () => {
        const parts = data.split('\r\n\r\n');
        try {
          const json = JSON.parse(parts[1]);
          if (json.clientIp) {
            resolve({
              status: 'alive',
              ip,
              port,
              country: json.country || 'Unknown',
              asn: json.asn || 'Unknown',
              org: json.asOrganization || 'Unknown',
              latitude: json.latitude || 'Unknown',
              longitude: json.longitude || 'Unknown',
              colo: json.colo || 'Unknown',
              httpProtocol: json.httpProtocol || 'Unknown'
            });
          } else {
            reject(new Error('Invalid JSON response'));
          }
        } catch (e) {
          reject(new Error('Failed to parse JSON from proxy'));
        }
      });

      secureSocket.on('error', err => {
        reject(new Error('TLS socket error: ' + err.message));
      });
    });

    socket.on('error', err => {
      reject(new Error('TCP socket error: ' + err.message));
    });
  });
}
