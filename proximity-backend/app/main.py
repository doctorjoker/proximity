from contextlib import asynccontextmanager
from app.modules.tr143_diagnostics.router import router as tr143_diagnostics_router
from app.routers import device_diagnostics
from app.modules.cpe_profiles.router import router as cpe_profiles_router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.services.acs_auto_sync import acs_auto_sync_service
from app.routers.acs import router as acs_router

from app.routers.discovery import router as discovery_router
from app.routers.acs_auto_sync import router as acs_auto_sync_router

from app.routers.devices import router as devices_router

from app.routers.tasks import router as tasks_router

from app.routers.wifi import router as wifi_router

from app.routers.wan import router as wan_router

from app.routers.voip import router as voip_router

from app.routers.firmware import router as firmware_router

from app.routers.customers import router as customers_router

from app.routers.network import router as network_router

from app.routers.wifi_analytics import router as wifi_analytics_router

from app.routers.device_assurance import router as device_assurance_router

from app.routers.customer_experience import router as customer_experience_router

from app.routers.wan_assurance import router as wan_assurance_router

from app.routers.internet_experience import router as internet_experience_router

from app.routers.voip_assurance import router as voip_assurance_router

from app.routers.home_network import router as home_network_router

from app.routers.device_intelligence import router as device_intelligence_router

from app.routers.customer360 import router as customer360_router

from app.routers.proactive_care import router as proactive_care_router

from app.modules.provisioning.router import router as provisioning_router

from app.modules.activation.router import router as activation_router

from app.modules.desired_config.router import router as desired_config_router

from app.modules.device_authority.router import router as device_authority_router

from app.modules.customer_services.router import router as customer_services_router

from app.modules.service_verification.router import \
    router as service_verification_router

from app.modules.router_replacement.router import \
    router as router_replacement_router

from app.modules.router_availability.router import (
    router as router_availability_router,
)

from app.modules.service_workflows.router import (
    router as service_workflows_router,
)

from app.modules.service_workflows.router import (
    router as service_workflows_router,
)

from app.modules.service_provisioning.router import (
    router as service_provisioning_router,
)

from app.modules.procedures.router import router as procedures_router

from app.modules.procedures.phase_router import router as procedure_phase_router

from app.modules.procedures.variable_router import router as procedure_variable_router

from app.modules.procedures.publish_router import router as procedure_publication_router

from app.modules.procedure_monitoring.router import (
    router as procedure_monitoring_router,
)

from app.modules.procedure_runtime.router import router as procedure_runtime_router

from app.modules.provisioning_profiles.router import (
    router as provisioning_profiles_router,
)

from app.modules.diagnostics_history.router import router as diagnostics_history_router
from app.modules.client_intelligence.router import router as client_intelligence_router
from app.routers.device_acs_identities import router as device_acs_identities_router
from app.modules.device_diagnostics.router import router as device_diagnostics_router
from app.modules.cpe_capabilities.router import router as cpe_capabilities_router
from app.modules.diagnostic_servers.router import router as diagnostic_servers_router
from app.modules.tr143_qualification.router import router as tr143_qualification_router

@asynccontextmanager
async def proximity_lifespan(app: FastAPI):
    await acs_auto_sync_service.start()
    try:
        yield
    finally:
        await acs_auto_sync_service.stop()


app = FastAPI(
    title=settings.app_name,
    version="6.0.0-foundation",
    lifespan=proximity_lifespan,
)

app.include_router(tr143_qualification_router)
app.include_router(diagnostic_servers_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cpe_capabilities_router)
app.include_router(acs_router)

app.include_router(device_acs_identities_router)

app.include_router(discovery_router)
app.include_router(acs_auto_sync_router)

app.include_router(devices_router)

app.include_router(tasks_router)

app.include_router(wifi_router)

app.include_router(wan_router)

app.include_router(voip_router)

app.include_router(firmware_router)

app.include_router(customers_router)

app.include_router(network_router)

app.include_router(wifi_analytics_router)

app.include_router(device_assurance_router)

app.include_router(customer_experience_router)

app.include_router(wan_assurance_router)

app.include_router(internet_experience_router)

app.include_router(voip_assurance_router)

app.include_router(home_network_router)

app.include_router(device_intelligence_router)

app.include_router(customer360_router)

app.include_router(proactive_care_router)

app.include_router(provisioning_router)

app.include_router(activation_router)

app.include_router(desired_config_router)

app.include_router(device_authority_router)

app.include_router(customer_services_router)

app.include_router(service_verification_router)

app.include_router(router_replacement_router)

app.include_router(router_availability_router)

app.include_router(service_workflows_router)

app.include_router(service_provisioning_router)

app.include_router(procedures_router)

app.include_router(procedure_phase_router)

app.include_router(procedure_variable_router)

app.include_router(procedure_publication_router)

app.include_router(procedure_monitoring_router)

app.include_router(procedure_runtime_router)

app.include_router(provisioning_profiles_router)

app.include_router(cpe_profiles_router)

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "app": settings.app_name,
        "environment": settings.environment,
    }

app.include_router(device_diagnostics.router)

# EUREKA27.2 - TR-143 Download Diagnostics
app.include_router(tr143_diagnostics_router)

# EUREKA28.0.0 - Diagnostics Center Foundation
app.include_router(diagnostics_history_router)

app.include_router(client_intelligence_router)

# EUREKA32.0.0_DEVICE_DIAGNOSTICS_ENGINE
app.include_router(device_diagnostics_router)
