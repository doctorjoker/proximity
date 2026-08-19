import Keycloak from 'keycloak-js'

const keycloak = new Keycloak({
  url: 'https://ias.speednetwifi.it',
  realm: 'NOVASPACE',
  clientId: 'proximity',
})

export default keycloak
