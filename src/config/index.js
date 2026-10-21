import 'dotenv/config';

export const config = {
  port: process.env.PORT || 3000,
  ipsecPeerIp: process.env.IPSEC_PEER_IP || '138.219.245.130',
  ipsecSecret: process.env.IPSEC_SECRET || 'Perfill0102@',
  snmpCommunity: process.env.SNMP_COMMUNITY || 'Perfill'
};
