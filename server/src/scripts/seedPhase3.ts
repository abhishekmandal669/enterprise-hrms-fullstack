import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 [SEED PHASE 3] Seeding Recruitment, Training, and Custom Reports...');

  const hrAdmin = await prisma.user.findFirst({
    where: { role: 'HR_ADMIN' }
  });
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });
  const engineeringDept = await prisma.department.findFirst({
    where: { code: 'ENG' }
  });
  const hrDept = await prisma.department.findFirst({
    where: { code: 'HR' }
  });

  const creatorId = hrAdmin?.id || admin?.id;

  // 1. Seed Job Openings
  const job1 = await prisma.jobOpening.create({
    data: {
      title: 'Senior Full-Stack Engineer (React + Node.js)',
      departmentId: engineeringDept?.id,
      location: 'Bangalore / Hybrid',
      jobType: 'FULL_TIME',
      experienceLevel: 'SENIOR',
      openPositions: 3,
      description: 'We are seeking an experienced Full-Stack Engineer to architect enterprise-grade microservices and modern React applications.',
      requirements: '5+ years experience with TypeScript, React, Node.js, PostgreSQL/SQLite, Prisma, and Redis.',
      salaryMin: 1800000,
      salaryMax: 2800000,
      status: 'OPEN',
      deadline: '2026-10-31',
      postedById: creatorId
    }
  });

  const job2 = await prisma.jobOpening.create({
    data: {
      title: 'Lead DevOps & Cloud Architect',
      departmentId: engineeringDept?.id,
      location: 'Bangalore / Remote',
      jobType: 'FULL_TIME',
      experienceLevel: 'LEAD',
      openPositions: 1,
      description: 'Own enterprise infrastructure reliability, Kubernetes orchestrations, CI/CD automation, and cloud security postures.',
      requirements: '7+ years with AWS, Kubernetes, Terraform, Docker, and SOC2 compliance automation.',
      salaryMin: 2500000,
      salaryMax: 3500000,
      status: 'OPEN',
      deadline: '2026-11-15',
      postedById: creatorId
    }
  });

  const job3 = await prisma.jobOpening.create({
    data: {
      title: 'HR Talent Partner & Ops Lead',
      departmentId: hrDept?.id,
      location: 'Bangalore HQ',
      jobType: 'FULL_TIME',
      experienceLevel: 'MID_LEVEL',
      openPositions: 2,
      description: 'Drive talent acquisition lifecycle, employee onboarding journeys, and organizational retention strategies.',
      requirements: '3-5 years tech recruiting and HR operations experience.',
      salaryMin: 1000000,
      salaryMax: 1500000,
      status: 'OPEN',
      deadline: '2026-10-15',
      postedById: creatorId
    }
  });

  // 2. Seed Candidates & Applications
  const candidate1 = await prisma.candidate.upsert({
    where: { email: 'aarav.sharma@talentpool.io' },
    update: {},
    create: {
      fullName: 'Aarav Sharma',
      email: 'aarav.sharma@talentpool.io',
      phone: '+91 98765 43210',
      currentCompany: 'Infotech Systems',
      currentCtc: 1600000,
      expectedCtc: 2200000,
      noticePeriodDays: 30,
      source: 'LINKEDIN',
      resumeUrl: 'https://storage.nexus.com/resumes/aarav_sharma_cv.pdf'
    }
  });

  const candidate2 = await prisma.candidate.upsert({
    where: { email: 'priya.nair@talentpool.io' },
    update: {},
    create: {
      fullName: 'Priya Nair',
      email: 'priya.nair@talentpool.io',
      phone: '+91 91234 56789',
      currentCompany: 'CloudScale Labs',
      currentCtc: 2400000,
      expectedCtc: 3000000,
      noticePeriodDays: 60,
      source: 'REFERRAL',
      resumeUrl: 'https://storage.nexus.com/resumes/priya_nair_cv.pdf'
    }
  });

  const candidate3 = await prisma.candidate.upsert({
    where: { email: 'rohan.mehta@talentpool.io' },
    update: {},
    create: {
      fullName: 'Rohan Mehta',
      email: 'rohan.mehta@talentpool.io',
      phone: '+91 99887 66554',
      currentCompany: 'InnovateX Solutions',
      currentCtc: 900000,
      expectedCtc: 1300000,
      noticePeriodDays: 15,
      source: 'CAREER_PORTAL',
      resumeUrl: 'https://storage.nexus.com/resumes/rohan_mehta_cv.pdf'
    }
  });

  // Applications
  const app1 = await prisma.jobApplication.create({
    data: {
      jobId: job1.id,
      candidateId: candidate1.id,
      stage: 'INTERVIEW',
      status: 'ACTIVE',
      notes: 'Strong candidate with deep React performance tuning experience.'
    }
  });

  const app2 = await prisma.jobApplication.create({
    data: {
      jobId: job2.id,
      candidateId: candidate2.id,
      stage: 'OFFER',
      status: 'ACTIVE',
      notes: 'Cleared architecture and leadership rounds with distinction.'
    }
  });

  await prisma.jobApplication.create({
    data: {
      jobId: job3.id,
      candidateId: candidate3.id,
      stage: 'SCREENING',
      status: 'ACTIVE',
      notes: 'Screening scheduled for tomorrow.'
    }
  });

  // 3. Seed Interview for App 1
  await prisma.interview.create({
    data: {
      applicationId: app1.id,
      interviewerId: creatorId,
      interviewType: 'TECHNICAL',
      scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      durationMinutes: 60,
      meetingLink: 'https://meet.google.com/nex-tech-interview',
      feedback: 'Excellent problem solving and clear understanding of asynchronous NodeJS patterns.',
      rating: 5,
      recommendation: 'STRONG_HIRE',
      status: 'SCHEDULED'
    }
  });

  // 4. Seed Offer Letter for App 2
  await prisma.offerLetter.create({
    data: {
      applicationId: app2.id,
      offeredRole: 'Lead DevOps & Cloud Architect',
      offeredCtc: 3200000,
      joiningDate: '2026-11-01',
      expiryDate: '2026-10-15',
      status: 'SENT',
      notes: 'Official executive offer package sent with stock appreciation rights.',
      letterContent: 'We are pleased to extend this formal offer of employment for the role of Lead DevOps & Cloud Architect at Nexus Technologies Private Limited.'
    }
  });

  // 5. Seed Training Programs
  const training1 = await prisma.trainingProgram.create({
    data: {
      title: 'Enterprise Microservices Security & OWASP Top 10',
      category: 'TECHNICAL',
      trainerName: 'Dr. Vikram Malhotra (Certified Ethical Hacker)',
      description: 'Comprehensive hands-on workshop on securing REST/GraphQL microservices, mitigating OWASP vulnerabilities, and JWT security best practices.',
      startDate: '2026-10-05',
      endDate: '2026-10-09',
      maxCapacity: 25,
      status: 'UPCOMING'
    }
  });

  const training2 = await prisma.trainingProgram.create({
    data: {
      title: 'Workplace Inclusion & POSH Compliance Certification',
      category: 'COMPLIANCE',
      trainerName: 'Adv. Ananya Sengupta',
      description: 'Mandatory annual corporate compliance training on Prevention of Sexual Harassment (POSH) and equal opportunity workplace conduct.',
      startDate: '2026-09-25',
      endDate: '2026-09-26',
      maxCapacity: 100,
      status: 'ONGOING'
    }
  });

  await prisma.trainingProgram.create({
    data: {
      title: 'Strategic Engineering Leadership & OKR Mastery',
      category: 'LEADERSHIP',
      trainerName: 'Sunil Krishnan (VP of Engineering)',
      description: 'High-impact workshop for Team Leads and Engineering Managers covering agile velocity, OKR alignment, and team mentorship.',
      startDate: '2026-08-10',
      endDate: '2026-08-14',
      maxCapacity: 15,
      status: 'COMPLETED'
    }
  });

  // Enrollments
  const allUsers = await prisma.user.findMany({ take: 5 });
  for (const user of allUsers) {
    await prisma.trainingEnrollment.upsert({
      where: {
        programId_userId: {
          programId: training2.id,
          userId: user.id
        }
      },
      update: {},
      create: {
        programId: training2.id,
        userId: user.id,
        status: 'ENROLLED'
      }
    });

    // Sample Certification
    await prisma.certification.create({
      data: {
        userId: user.id,
        name: 'AWS Certified Solutions Architect - Associate',
        issuingOrg: 'Amazon Web Services',
        issueDate: '2025-06-15',
        expiryDate: '2028-06-15',
        credentialId: `AWS-SAA-${user.employeeCode}-2025`,
        credentialUrl: 'https://aws.amazon.com/verification',
        verifiedByHR: true,
        verifiedById: creatorId,
        verifiedAt: new Date()
      }
    });
  }

  // 6. Seed Sample Custom Report
  await prisma.customReport.create({
    data: {
      title: 'Comprehensive Workforce & Attendance Ledger',
      description: 'Exportable breakdown combining employee demographics, designation, and monthly attendance ratios.',
      module: 'EMPLOYEES',
      columnsJson: JSON.stringify([
        'employeeCode',
        'fullName',
        'email',
        'department',
        'designation',
        'status',
        'joiningDate'
      ]),
      filtersJson: JSON.stringify({ status: 'ACTIVE' }),
      createdById: creatorId
    }
  });

  console.log('✅ [SEED PHASE 3] Successfully seeded Recruitment, Training, and Reports data.');
}

main()
  .catch((e) => {
    console.error('❌ [SEED ERROR]:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
