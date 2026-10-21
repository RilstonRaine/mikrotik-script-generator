/**
 * Utilitários e cálculos de sub-rede IPv4
 */

export function ipToInt(ip) {
  if (!ip || typeof ip !== 'string') {
    throw new Error('Informe um endereço IPv4.');
  }

  const parts = ip.trim().split('.');
  if (parts.length !== 4 || parts.some(part => !/^\d{1,3}$/.test(part) || Number(part) > 255)) {
    throw new Error('Informe um IPv4 válido (exemplo: 10.98.45.38).');
  }

  return parts.reduce((acc, octet) => (acc * 256 + Number(octet)) >>> 0, 0) >>> 0;
}

export function intToIp(intVal) {
  return [
    (intVal >>> 24) & 255,
    (intVal >>> 16) & 255,
    (intVal >>> 8) & 255,
    intVal & 255
  ].join('.');
}

/**
 * Calcula a sub-rede /30 a partir do IP da câmera.
 * Regra Perfill: o IP fornecido DEVE ser o segundo host utilizável da rede /30.
 * Host 1: Gateway da RB
 * Host 2: IP da câmera
 */
export function calculateSubnet(ip) {
  const ipInt = ipToInt(ip);
  const netInt = (ipInt & 0xfffffffc) >>> 0;

  if (ipInt - netInt !== 2) {
    throw new Error(
      'O IP deve ser o segundo host utilizável de uma rede /30. Exemplo: 10.98.45.38 → rede 10.98.45.36/30, gateway da RB 10.98.45.37.'
    );
  }

  if (netInt === 0 || netInt >= 0xfffffffc) {
    throw new Error('Este endereço não permite calcular uma rede /30 utilizável.');
  }

  return {
    network: intToIp(netInt),
    gateway: intToIp(netInt + 1),
    camera: intToIp(ipInt),
    broadcast: intToIp(netInt + 3),
    mask: '255.255.255.252',
    cidr: `${intToIp(netInt)}/30`
  };
}
