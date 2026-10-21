import { config } from '../config/index.js';

export function escapeMikrotikString(str) {
  return '"' + String(str).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n]/g, ' ') + '"';
}

export function sanitizeFilename(siteName, cameraIp) {
  const base = (siteName || '').trim() || `camera_${(cameraIp || 'ponto').replace(/\./g, '_')}`;
  return base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 45) || 'camera';
}

/**
 * Constrói o script RouterOS no padrão Perfill
 */
export function buildMikrotikScript(params, netInfo) {
  const {
    siteName = '',
    wanType = 'DHCP',
    wanInterface = 'ether1',
    lanPorts = 'ether2,ether3,ether4,ether5',
    pppoeUser = '',
    pppoePass = '',
    routerVersion = ''
  } = params;

  const pointLabel = siteName.replace(/[\r\n]/g, ' ').trim() || 'PONTO';

  const ports = String(lanPorts)
    .split(',')
    .map(p => p.trim())
    .filter(Boolean);

  if (!ports.length) {
    throw new Error('Informe ao menos uma interface LAN.');
  }

  if (new Set(ports).size !== ports.length) {
    throw new Error('Há interfaces LAN repetidas.');
  }

  if (ports.includes(wanInterface)) {
    throw new Error('A interface WAN não pode também estar na bridge LAN.');
  }

  const allowedInterfaces = ['ether1', 'ether2', 'ether3', 'ether4', 'ether5', 'ether6', 'ether7', 'ether8', 'sfp1'];
  for (const port of ports) {
    if (!allowedInterfaces.includes(port)) {
      throw new Error(`Interface LAN não reconhecida: ${port}`);
    }
  }

  if (wanType === 'PPPoE' && (!pppoeUser.trim() || !pppoePass)) {
    throw new Error('Para conexão PPPoE, informe o usuário e a senha da operadora.');
  }

  const lines = [
    '############################################',
    '# CONFIGURACAO PADRAO PERFILL',
    '#',
    `# PONTO: ${pointLabel}`,
    `# WAN: ${wanType} - ${wanInterface}`,
    `# REDE: ${netInfo.cidr}`,
    `# RB: ${netInfo.gateway}`,
    `# CAMERA: ${netInfo.camera}`,
    `# BROADCAST: ${netInfo.broadcast}`,
    `# MASCARA: ${netInfo.mask}`,
    routerVersion ? `# VERSAO INFORMADA: ${routerVersion}` : '',
    '############################################',
    '',
    '',
    '############################################',
    '# BRIDGE',
    '############################################',
    '',
    '',
    '/interface bridge',
    'add name=bridge1 comment="Bridge LAN"',
    '',
    '',
    '############################################',
    '# PORTAS DA BRIDGE',
    '############################################',
    '',
    '',
    '/interface bridge port',
    ...ports.map(p => `add bridge=bridge1 interface=${p}`),
    '',
    '',
    '############################################',
    '# IP DA BRIDGE',
    '############################################',
    '',
    '',
    '/ip address',
    `add address=${netInfo.gateway}/30 interface=bridge1 comment="IP da RB"`,
    '',
    '',
    '############################################',
    '# WAN',
    '############################################',
    '',
    ''
  ];

  if (wanType === 'DHCP') {
    lines.push(
      '/ip dhcp-client',
      `add interface=${wanInterface} add-default-route=yes use-peer-dns=yes disabled=no`,
      '',
      ''
    );
  } else {
    lines.push(
      '/interface pppoe-client',
      `add name=pppoe-out1 interface=${wanInterface} user=${escapeMikrotikString(pppoeUser)} password=${escapeMikrotikString(pppoePass)} add-default-route=yes use-peer-dns=yes disabled=no`,
      '',
      ''
    );
  }

  lines.push(
    '############################################',
    '# DNS',
    '############################################',
    '',
    '',
    '/ip dns',
    'set allow-remote-requests=yes',
    '',
    '',
    '############################################',
    '# PROFILE IPSEC - PHASE 1',
    '############################################',
    '',
    '',
    '/ip ipsec profile',
    'add \\',
    'name=PHASE-PERFILL-01 \\',
    'hash-algorithm=sha1 \\',
    'enc-algorithm=3des,aes-128,aes-256 \\',
    'dh-group=modp1024,modp1536,modp2048,modp3072 \\',
    'nat-traversal=yes \\',
    'dpd-interval=120s \\',
    'dpd-maximum-failures=5',
    '',
    '',
    '############################################',
    '# PEER - FORTIGATE',
    '############################################',
    '',
    '',
    '/ip ipsec peer',
    'add \\',
    'name=FGT_PERFILL \\',
    `address=${config.ipsecPeerIp} \\`,
    'exchange-mode=main \\',
    'profile=PHASE-PERFILL-01 \\',
    'send-initial-contact=yes',
    '',
    '',
    '############################################',
    '# IDENTITY - PSK',
    '############################################',
    '',
    '',
    '/ip ipsec identity',
    'add \\',
    'peer=FGT_PERFILL \\',
    'auth-method=pre-shared-key \\',
    `secret=${escapeMikrotikString(config.ipsecSecret)}`,
    '',
    '',
    '############################################',
    '# PROPOSAL - PHASE 2',
    '############################################',
    '',
    '',
    '/ip ipsec proposal',
    'add \\',
    'name=PHASE-PERFILL-02 \\',
    'auth-algorithms=sha1,sha256 \\',
    'enc-algorithms=aes-128-cbc,aes-256-cbc \\',
    'pfs-group=modp2048',
    '',
    '',
    '############################################',
    '# POLICIES IPSEC',
    '############################################',
    '',
    ''
  );

  const ipsecDestinations = [
    '10.10.10.0/24',
    '10.98.214.0/24',
    '10.91.0.0/16',
    '10.98.212.0/24'
  ];

  for (const dst of ipsecDestinations) {
    lines.push(
      '/ip ipsec policy',
      'add \\',
      'peer=FGT_PERFILL \\',
      'tunnel=yes \\',
      `src-address=${netInfo.cidr} \\`,
      `dst-address=${dst} \\`,
      'proposal=PHASE-PERFILL-02',
      '',
      ''
    );
  }

  lines.push(
    '############################################',
    '# SNMP',
    '############################################',
    '',
    '',
    '/snmp',
    `set enabled=yes contact=Perfill location=${escapeMikrotikString(pointLabel)}`,
    '',
    '',
    '/snmp community',
    'remove [find]',
    '',
    '',
    '/snmp community',
    `add name=${config.snmpCommunity} addresses=0.0.0.0/0 read-access=yes write-access=no`,
    '',
    '',
    '############################################',
    '# DESABILITAR SERVICOS DESNECESSARIOS',
    '############################################',
    '',
    '',
    '/ip service',
    'disable telnet',
    'disable ftp',
    'disable www',
    'disable www-ssl',
    'disable ssh',
    'disable api',
    'disable api-ssl',
    '',
    '',
    '############################################',
    '# FIM DA CONFIGURACAO',
    '############################################'
  );

  return lines
    .filter((line, idx) => !(line === '' && lines[idx - 1] === ''))
    .join('\n') + '\n';
}
