
export const evaluationDataset = [
  {
    id: 'Q001',
    question: '公司 VPN 如何完成身份认证？',
    category: 'VPN',
    expectedDocIds: ['vpn-guide'],
    relevantChunkIds: [
      'vpn-guide-v1-001'
    ],
    shouldAbstain: false,
    expectedFacts: [
      '员工账号',
      '密码',
      '手机验证码'
    ],
    labelStatus: 'labeled'
  },
  {
    id: 'Q002',
    question: 'VPN 客户端应该如何安装？',
    category: 'VPN',
    expectedDocIds: ['vpn-guide'],
    relevantChunkIds: [
      'vpn-guide-v1-001'
    ],
    shouldAbstain: false,
    expectedFacts: [
      '下载公司指定的 VPN 客户端',
      '安装完成后打开 VPN 客户端'
    ],
    labelStatus: 'labeled'
  },
  {
    id: 'Q003',
    question: 'VPN 连接失败应该怎么办？',
    category: 'VPN',
    expectedDocIds: ['vpn-guide'],
    relevantChunkIds: [
      'vpn-guide-v1-001',
      'vpn-guide-v1-002'
    ],
    shouldAbstain: false,
    expectedFacts: [
      '检查本地网络状态'
    ],
    labelStatus: 'labeled'
  },
  {
    id: 'Q004',
    question: 'VPN 认证失败应该检查什么？',
    category: 'VPN',
    expectedDocIds: ['vpn-guide'],
    relevantChunkIds: [
      'vpn-guide-v1-001',
      'vpn-guide-v1-002'
    ],
    shouldAbstain: false,
    expectedFacts: [
      '检查账号密码是否正确'
    ],
    labelStatus: 'labeled'
  },
  {
    id: 'Q005',
    question: '公司 VPN 使用什么方式验证身份？',
    category: 'VPN',
    expectedDocIds: ['vpn-guide'],
    relevantChunkIds: [
      'vpn-guide-v1-001'
    ],
    shouldAbstain: false,
    expectedFacts: [
      '员工账号',
      '密码',
      '手机验证码'
    ],
    labelStatus: 'labeled'
  },
  {
    id: 'Q006',
    question: 'VPN 无法连接时应该联系谁？',
    category: 'VPN',
    expectedDocIds: ['vpn-guide'],
    relevantChunkIds: [
      'vpn-guide-v1-001',
      'vpn-guide-v1-002'
    ],
    shouldAbstain: false,
    expectedFacts: [
      '如果问题仍然存在',
      '联系 IT 管理员'
    ],
    labelStatus: 'labeled'
  }
];
