import { Router } from 'express';
import { calculateSubnet } from '../services/network.service.js';
import { buildMikrotikScript, sanitizeFilename } from '../services/mikrotik.service.js';

const router = Router();

/**
 * Rota de status/healthcheck da API
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'MikroTik Script Generator API',
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/generate
 * Gera o script RouterOS e calcula os parâmetros de rede
 */
router.post('/generate', (req, res) => {
  try {
    const {
      siteName = '',
      cameraIp = '',
      wanType = 'DHCP',
      wanInterface = 'ether1',
      lanPorts = 'ether2,ether3,ether4,ether5',
      pppoeUser = '',
      pppoePass = '',
      routerVersion = ''
    } = req.body || {};

    if (!cameraIp) {
      return res.status(400).json({
        success: false,
        error: 'O endereço IP da câmera é obrigatório.'
      });
    }

    // Calcula os parâmetros da sub-rede /30
    const netInfo = calculateSubnet(cameraIp);

    // Constrói o script MikroTik
    const script = buildMikrotikScript(
      {
        siteName,
        wanType,
        wanInterface,
        lanPorts,
        pppoeUser,
        pppoePass,
        routerVersion
      },
      netInfo
    );

    const baseFilename = sanitizeFilename(siteName, netInfo.camera);

    return res.json({
      success: true,
      script,
      filename: baseFilename,
      facts: {
        cidr: netInfo.cidr,
        network: netInfo.network,
        gateway: netInfo.gateway,
        camera: netInfo.camera,
        broadcast: netInfo.broadcast,
        mask: netInfo.mask
      }
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message || 'Erro ao processar e gerar o script.'
    });
  }
});

/**
 * POST /api/download
 * Endpoint auxiliar para download via servidor com headers apropriados
 */
router.post('/download', (req, res) => {
  try {
    const { content = '', filename = 'script', extension = 'rsc' } = req.body || {};
    const cleanExt = extension.toLowerCase() === 'txt' ? 'txt' : 'rsc';
    const cleanName = `${sanitizeFilename(filename)}.${cleanExt}`;

    res.setHeader('Content-Disposition', `attachment; filename="${cleanName}"`);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(content);
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Erro ao preparar arquivo para download.'
    });
  }
});

export default router;
