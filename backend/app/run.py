import json
import logging

import uvicorn


class SystemJsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        return json.dumps({"level": record.levelname, "message": record.getMessage(), "request_id": "system"})


LOG_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"json": {"()": "app.run.SystemJsonFormatter"}},
    "handlers": {"default": {"class": "logging.StreamHandler", "formatter": "json", "stream": "ext://sys.stdout"}},
    "loggers": {
        "uvicorn": {"handlers": ["default"], "level": "INFO", "propagate": False},
        "uvicorn.error": {"handlers": ["default"], "level": "INFO", "propagate": False},
    },
}


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, access_log=False,
                proxy_headers=False, timeout_graceful_shutdown=30, log_config=LOG_CONFIG)
