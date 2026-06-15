from app.device_profiles.generic_tr181 import GENERIC_TR181_PROFILE


TPLINK_XC220_G3V_PROFILE = {
    **GENERIC_TR181_PROFILE,
    "profile_code": "tplink_xc220_g3v",
    "name": "TP-Link XC220-G3v",
    "match": {
        "manufacturer": "TP-Link",
        "model": "XC220-G3v",
    },
    "paths": {
        **GENERIC_TR181_PROFILE.get("paths", {}),

        "wan_ppp_username": [
            "Device.PPP.Interface.1.Username",
        ],
        "wan_ppp_password": [
            "Device.PPP.Interface.1.Password",
        ],
        "wan_ppp_status": [
            "Device.PPP.Interface.1.Status",
            "Device.PPP.Interface.1.ConnectionStatus",
        ],
        "wan_ip_address": [
            "Device.PPP.Interface.1.IPCP.LocalIPAddress",
        ],
        "dns_servers": [
            "Device.PPP.Interface.1.IPCP.DNSServers",
        ],
        "wan_vlan_id": [
            "Device.Ethernet.VLANTermination.1.VLANID",
        ],

        "voip_sip_username": [
            "Device.X_TP_Services.X_TP_VoiceService.1.VoiceProfile.1.MultiIsp.1.MultiAuthUserName",
            "Device.X_TP_Services.VoiceService.1.VoiceProfile.1.Line.1.SIP.AuthUserName",
        ],
        "voip_sip_password": [
            "Device.X_TP_Services.X_TP_VoiceService.1.VoiceProfile.1.MultiIsp.1.MultiAuthPassword",
            "Device.X_TP_Services.VoiceService.1.VoiceProfile.1.Line.1.SIP.AuthPassword",
        ],
        "voip_directory_number": [
            "Device.X_TP_Services.X_TP_VoiceService.1.VoiceProfile.1.Line.1.DirectoryNumber",
            "Device.X_TP_Services.VoiceService.1.VoiceProfile.1.Line.1.DirectoryNumber",
        ],
        "voip_proxy_server": [
            "Device.X_TP_Services.X_TP_VoiceService.1.VoiceProfile.1.MultiIsp.1.MultiProxyServer",
            "Device.X_TP_Services.VoiceService.1.VoiceProfile.1.SIP.ProxyServer",
        ],
        "voip_registrar_server": [
            "Device.X_TP_Services.X_TP_VoiceService.1.VoiceProfile.1.MultiIsp.1.MultiRegistrarServer",
            "Device.X_TP_Services.VoiceService.1.VoiceProfile.1.SIP.RegistrarServer",
        ],
        "voip_registrar_port": [
            "Device.X_TP_Services.X_TP_VoiceService.1.VoiceProfile.1.MultiIsp.1.MultiRegistrarServerPort",
            "Device.X_TP_Services.VoiceService.1.VoiceProfile.1.SIP.RegistrarServerPort",
        ],
    },
}
