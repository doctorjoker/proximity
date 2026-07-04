"""
EUREKA 8.0.0

Service Provisioning Workflow Definition

This file contains ONLY the workflow definition.

No business logic is allowed here.
"""


SERVICE_PROVISIONING_WORKFLOW = [

    {
        "step": "BIND_DEVICE",
        "title": "Bind Device",
    },

    {
        "step": "CONFIGURE_PPP",
        "title": "Configure PPPoE",
    },

    {
        "step": "CONFIGURE_WIFI",
        "title": "Configure WiFi",
    },

    {
        "step": "CONFIGURE_VOIP",
        "title": "Configure VoIP",
    },

    {
        "step": "VERIFY_CONFIGURATION",
        "title": "Verify Configuration",
    },

    {
        "step": "VERIFY_RUNTIME",
        "title": "Verify Runtime",
    },

    {
        "step": "COMPLETE",
        "title": "Complete",
    },

]
