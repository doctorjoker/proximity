from .verifiers import verify_pppoe, verify_wifi, verify_voip


VERIFY_HANDLERS = {
    "PPPOE": verify_pppoe,
    "WIFI": verify_wifi,
    "VOIP": verify_voip,
}
