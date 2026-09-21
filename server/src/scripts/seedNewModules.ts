import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 [SEED NEW MODULES] Seeding Assets, Documents, Delegations & RBAC Permissions...');

  const users = await prisma.user.findMany({ take: 10 });
  if (users.length === 0) {
    console.log('No users found to seed data.');
    return;
  }

  const manager = users.find(u => u.role === 'MANAGER') || users[1];
  const emp1 = users.find(u => u.role === 'EMPLOYEE') || users[2];
  const emp2 = users.filter(u => u.role === 'EMPLOYEE')[1] || users[3] || users[0];
  const admin = users.find(u => u.role === 'ADMIN' || u.role === 'HR_ADMIN') || users[0];

  // 1. Seed Assets & Assignments
  const existingAssets = await prisma.asset.count();
  if (existingAssets === 0) {
    const assetsData = [
      {
        assetCode: 'AST-LPT-0001',
        name: 'MacBook Pro 16" (M2 Max, 32GB RAM, 1TB SSD)',
        category: 'LAPTOP',
        brand: 'Apple',
        modelNumber: 'A2780',
        serialNumber: 'C02G89XMD6T5',
        purchaseDate: '2024-03-15',
        purchaseCost: 249900,
        warrantyExpiry: '2027-03-14',
        status: 'ASSIGNED',
        condition: 'GOOD'
      },
      {
        assetCode: 'AST-LPT-0002',
        name: 'Dell XPS 15 9530 (i7-13700H, 32GB, RTX 4060)',
        category: 'LAPTOP',
        brand: 'Dell',
        modelNumber: 'XPS-9530-OLED',
        serialNumber: 'DL9530X4492',
        purchaseDate: '2024-05-10',
        purchaseCost: 195000,
        warrantyExpiry: '2027-05-09',
        status: 'ASSIGNED',
        condition: 'GOOD'
      },
      {
        assetCode: 'AST-LPT-0003',
        name: 'Lenovo ThinkPad T14s Gen 4 (AMD Ryzen 7 Pro)',
        category: 'LAPTOP',
        brand: 'Lenovo',
        modelNumber: '21F8CTO1WW',
        serialNumber: 'PF38XK91',
        purchaseDate: '2024-06-01',
        purchaseCost: 125000,
        warrantyExpiry: '2027-05-31',
        status: 'AVAILABLE',
        condition: 'NEW'
      },
      {
        assetCode: 'AST-MON-0001',
        name: 'Dell UltraSharp 27" 4K USB-C Hub Monitor (U2723QE)',
        category: 'MONITOR',
        brand: 'Dell',
        modelNumber: 'U2723QE',
        serialNumber: 'CN-098K4-742',
        purchaseDate: '2024-04-12',
        purchaseCost: 56000,
        warrantyExpiry: '2027-04-11',
        status: 'ASSIGNED',
        condition: 'GOOD'
      },
      {
        assetCode: 'AST-MON-0002',
        name: 'LG 34" UltraWide WQHD Curved IPS Monitor',
        category: 'MONITOR',
        brand: 'LG',
        modelNumber: '34WN80C-B',
        serialNumber: 'LG34WN80C-892',
        purchaseDate: '2024-07-20',
        purchaseCost: 48500,
        warrantyExpiry: '2027-07-19',
        status: 'AVAILABLE',
        condition: 'NEW'
      },
      {
        assetCode: 'AST-PHN-0001',
        name: 'Apple iPhone 15 Pro 256GB (Natural Titanium - Corporate Line)',
        category: 'MOBILE_PHONE',
        brand: 'Apple',
        modelNumber: 'A3102',
        serialNumber: 'F2L4J98XKP',
        purchaseDate: '2024-02-10',
        purchaseCost: 134900,
        warrantyExpiry: '2025-02-09',
        status: 'ASSIGNED',
        condition: 'GOOD'
      },
      {
        assetCode: 'AST-ACC-0001',
        name: 'Logitech MX Master 3S Wireless Performance Mouse',
        category: 'ACCESSORY',
        brand: 'Logitech',
        modelNumber: 'MR0077',
        serialNumber: 'LZ938812',
        purchaseDate: '2024-08-01',
        purchaseCost: 8995,
        warrantyExpiry: '2026-07-31',
        status: 'AVAILABLE',
        condition: 'NEW'
      },
      {
        assetCode: 'AST-FUR-0001',
        name: 'Herman Miller Aeron Ergonomic Office Chair (Size B)',
        category: 'FURNITURE',
        brand: 'Herman Miller',
        modelNumber: 'AERON-B-GRPH',
        serialNumber: 'HM2024-AER-481',
        purchaseDate: '2024-01-15',
        purchaseCost: 115000,
        warrantyExpiry: '2036-01-14',
        status: 'ASSIGNED',
        condition: 'GOOD'
      },
      {
        assetCode: 'AST-ACC-0002',
        name: 'Sony WH-1000XM5 Noise Canceling Headphones',
        category: 'ACCESSORY',
        brand: 'Sony',
        modelNumber: 'WH-1000XM5',
        serialNumber: 'SN5938411',
        purchaseDate: '2024-03-01',
        purchaseCost: 26990,
        warrantyExpiry: '2025-02-28',
        status: 'UNDER_REPAIR',
        condition: 'DAMAGED'
      }
    ];

    for (const a of assetsData) {
      const createdAsset = await prisma.asset.create({ data: a });

      // Create active assignment if ASSIGNED
      if (a.status === 'ASSIGNED') {
        const assignedUser = a.assetCode.includes('LPT-0001') ? emp1 : a.assetCode.includes('LPT-0002') ? emp2 : manager;
        await prisma.assetAssignment.create({
          data: {
            assetId: createdAsset.id,
            userId: assignedUser.id,
            assignedDate: '2024-06-01',
            conditionOnAssign: 'GOOD',
            assignedById: admin.id,
            notes: 'Official corporate hardware allocation.',
            status: 'ACTIVE'
          }
        });
      }
    }
    console.log(`✅ Seeded ${assetsData.length} Assets with active assignments.`);
  }

  // 2. Seed Sample Documents
  const existingDocs = await prisma.document.count();
  if (existingDocs === 0) {
    const docs = [
      {
        userId: emp1.id,
        title: 'Signed Employment Agreement & Offer Acceptance',
        category: 'OFFER_LETTER',
        fileName: 'Lexvera_Offer_Letter_Signed.pdf',
        fileUrl: '/uploads/documents/sample_offer.pdf',
        fileSize: 1248500,
        mimeType: 'application/pdf',
        uploadedById: admin.id,
        status: 'VERIFIED'
      },
      {
        userId: emp1.id,
        title: 'Non-Disclosure & Confidentiality Agreement (NDA)',
        category: 'NDA',
        fileName: 'Corporate_NDA_2026.pdf',
        fileUrl: '/uploads/documents/sample_nda.pdf',
        fileSize: 845200,
        mimeType: 'application/pdf',
        uploadedById: emp1.id,
        status: 'VERIFIED'
      },
      {
        userId: emp1.id,
        title: 'Government Identity Proof (Aadhaar / Passport Copy)',
        category: 'ID_PROOF',
        fileName: 'Govt_ID_Proof.pdf',
        fileUrl: '/uploads/documents/sample_id.pdf',
        fileSize: 2048576,
        mimeType: 'application/pdf',
        uploadedById: emp1.id,
        status: 'VERIFIED'
      },
      {
        userId: emp2.id,
        title: 'Medical Fitness Certificate & Doctor Prescription',
        category: 'MEDICAL_CERTIFICATE',
        fileName: 'Apollo_Clinic_Medical_Cert.pdf',
        fileUrl: '/uploads/documents/medical_cert.pdf',
        fileSize: 654200,
        mimeType: 'application/pdf',
        uploadedById: emp2.id,
        status: 'VERIFIED'
      }
    ];

    for (const d of docs) {
      await prisma.document.create({ data: d });
    }
    console.log(`✅ Seeded ${docs.length} Corporate Documents.`);
  }

  // 3. Seed Sample Approval Delegation
  const existingDelegations = await prisma.delegationRequest.count();
  if (existingDelegations === 0 && manager && admin) {
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    await prisma.delegationRequest.create({
      data: {
        delegatorId: manager.id,
        delegateeId: admin.id,
        startDate: today,
        endDate: nextMonth,
        reason: 'Annual leave & international tech summit attendance. Approvals delegated to senior leadership.',
        status: 'ACTIVE'
      }
    });
    console.log('✅ Seeded active sample Approval Delegation.');
  }

  console.log('🎉 [SEED NEW MODULES] Successfully completed seeding.');
}

main()
  .catch(e => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
