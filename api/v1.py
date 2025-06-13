import json
from urllib.parse import parse_qs
from proxychecker import process_proxy

def handler(request, response):
    query = parse_qs(request['query'])
    ip = query.get('ip', [None])[0]
    port = query.get('port', [None])[0]

    if not ip or not port:
        return response.json({"error": "Missing ip or port parameter"}, status=400)

    try:
        success, message, country_code, asn, country_name, flag, protocol, org_name, conn_time, lat, lon, colo = process_proxy(ip, port)

        return response.json({
            "status": "alive" if success else "dead",
            "ip": ip,
            "port": port,
            "message": message,
            "country_code": country_code,
            "country_name": country_name,
            "flag": flag,
            "asn": asn,
            "org": org_name,
            "protocol": protocol,
            "connection_time_ms": round(conn_time, 2),
            "latitude": lat,
            "longitude": lon,
            "colo": colo
        })

    except Exception as e:
        return response.json({"error": str(e)}, status=500)
