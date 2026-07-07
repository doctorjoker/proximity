import os
import socket

WORKER_ID = os.getenv(
    "WORKFLOW_WORKER_ID",
    f"PROXIMITY-{socket.gethostname()}",
)
