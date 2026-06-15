GENERIC_TR181_PROFILE = {
    "profile_code": "generic_tr181",
    "name": "Generic TR-181",
    "match": {
        "root": "Device",
    },
    "capabilities": {
        "wan_read": True,
        "wan_write": True,
        "pppoe": True,
        "ipoe": True,
        "voip_read": True,
        "voip_write": True,
        "wifi_read": True,
        "wifi_write": True,
        "wifi_scan": True,
        "firmware_read": True,
        "firmware_upgrade": True,
    },
    "paths": {
        "wan_ppp_username": [
            "Device.PPP.Interface.1.Username",
            "Device.PPP.Interface.1.X_TP_Username",
        ],
        "wan_ppp_password": [
            "Device.PPP.Interface.1.Password",
            "Device.PPP.Interface.1.X_TP_Password",
        ],
        "wan_ppp_status": [
            "Device.PPP.Interface.1.Status",
        ],
        "wan_ip_address": [
            "Device.IP.Interface.1.IPv4Address.1.IPAddress",
            "Device.IP.Interface.2.IPv4Address.1.IPAddress",
        ],
        "wan_nat_enabled": [
            "Device.NAT.InterfaceSetting.1.Enable",
        ],
        "wan_vlan_id": [
            "Device.Ethernet.VLANTermination.1.VLANID",
            "Device.Ethernet.Link.1.VLANID",
        ],
        "dns_servers": [
            "Device.DNS.Client.Server.1.DNSServer",
            "Device.DNS.Client.Server.2.DNSServer",
        ],
        "voip_sip_username": [
            "Device.Services.VoiceService.1.VoiceProfile.1.Line.1.SIP.AuthUserName",
        ],
        "voip_sip_proxy": [
            "Device.Services.VoiceService.1.VoiceProfile.1.SIP.ProxyServer",
        ],
        "voip_line_status": [
            "Device.Services.VoiceService.1.VoiceProfile.1.Line.1.Status",
        ],
        "firmware_version": [
            "Device.DeviceInfo.SoftwareVersion",
        ],
        "hardware_version": [
            "Device.DeviceInfo.HardwareVersion",
        ],
        "product_class": [
            "Device.DeviceInfo.ProductClass",
        ],
        "manufacturer": [
            "Device.DeviceInfo.Manufacturer",
        ],

        "voip_sip_username": [
            "Device.Services.VoiceService.1.VoiceProfile.1.Line.1.SIP.AuthUserName",
        ],

        "voip_sip_password": [
            "Device.Services.VoiceService.1.VoiceProfile.1.Line.1.SIP.AuthPassword",
        ],

        "voip_directory_number": [
            "Device.Services.VoiceService.1.VoiceProfile.1.Line.1.DirectoryNumber",
        ],

        "voip_line_enable": [
            "Device.Services.VoiceService.1.VoiceProfile.1.Line.1.Enable",
        ],

        "voip_line_status": [
            "Device.Services.VoiceService.1.VoiceProfile.1.Line.1.Status",
        ],

        "voip_proxy_server": [
            "Device.Services.VoiceService.1.VoiceProfile.1.SIP.ProxyServer",
        ],

        "voip_registrar_server": [
            "Device.Services.VoiceService.1.VoiceProfile.1.SIP.RegistrarServer",
        ],
    },
}
