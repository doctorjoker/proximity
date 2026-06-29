ROUTER_REPLACEMENT_WORKFLOW = [
    {
        "step": "BINDING",
        "progress": 20,
        "handler": "replace_authorized_device",
    },
    {
        "step": "WAIT_ROUTER",
        "progress": 40,
        "handler": "wait_router_available",
    },
    {
        "step": "RESTORE",
        "progress": 70,
        "handler": "restore_customer_service_configuration",
    },
    {
        "step": "VERIFY",
        "progress": 90,
        "handler": "verify_customer_service",
    },
]
