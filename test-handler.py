import sys
import json

req = json.loads(sys.stdin.read())

print(json.dumps({
    "status": 200,
    "body": {
        "lang": "python",
        "method": req.get("method"),
        "path": req.get("path"),
        "message": "Hello from Python!"
    }
}))
