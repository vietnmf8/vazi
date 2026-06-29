import "dotenv/config";
import {
    PurposeOfVisit,
    VisaApplicationStatus,
    VisaType,
} from "@prisma/client";
import crypto from "crypto";

import prisma from "../src/lib/prisma";

const TOTAL_RECORDS = 10_000;
const BATCH_SIZE = 500;
const START_DATE = new Date("2023-01-01T00:00:00.000Z");
const END_DATE = new Date("2026-06-16T23:59:59.999Z");

type SeedApplication = {
    id: string;
    applicationCode: string;
    portId: string;
    contactEmail: string;
    contactPhone: string;
    visaType: VisaType;
    visaCategory: string;
    purposeOfVisit: PurposeOfVisit;
    arrivalDate: Date;
    processingTime: string;
    applicantCount: number;
    totalAmount: number;
    status: VisaApplicationStatus;
    createdAt: Date;
};

type SeedApplicant = {
    id: string;
    applicationId: string;
    fullName: string;
    gender: string;
    nationality: string;
    dateOfBirth: Date;
    passportNumber: string;
    passportExpiryDate: Date;
    passportImageUrl: string;
};

/**
 * Phân bổ status theo luồng nghiệp vụ mới: PAID → PROCESSING → COMPLETED/REJECTED.
 * PAID 20% để test chuyển sang PROCESSING, PROCESSING 15% để test kết thúc.
 */
function pickStatus(index: number): VisaApplicationStatus {
    const bucket = index % 100;
    if (bucket < 35) return "COMPLETED";
    if (bucket < 55) return "PAID";
    if (bucket < 70) return "PROCESSING";
    if (bucket < 90) return "REJECTED";
    return "PENDING";
}

function pickVisaType(index: number): VisaType {
    return index % 100 < 55 ? "E_VISA" : "VOA";
}

function pickApplicantCount(index: number): number {
    const counts = [1, 1, 1, 1, 1, 1, 2, 2, 2, 3, 3, 4, 5, 1, 2, 1, 3, 2, 1, 6];
    return counts[index % counts.length] ?? 1;
}

function calcTotalAmount(visaType: VisaType, applicantCount: number): number {
    const basePrice = visaType === "E_VISA" ? 25 : 45;
    return basePrice * applicantCount;
}

/** createdAt tuyến tính theo index — STT autoincrement khớp thứ tự thời gian. */
function linearCreatedAt(index: number, total: number): Date {
    if (total <= 1) return new Date(START_DATE);
    const ratio = index / (total - 1);
    return new Date(START_DATE.getTime() + (END_DATE.getTime() - START_DATE.getTime()) * ratio);
}

function buildApplicationCode(createdAt: Date, seq: number): string {
    const year = createdAt.getUTCFullYear();
    const month = String(createdAt.getUTCMonth() + 1).padStart(2, "0");
    return `VN-${year}${month}-${String(seq + 1).padStart(6, "0")}`;
}

/** 100 email dùng chung cho 1000 bản ghi đầu — test search trả nhiều kết quả. */
function buildEmail(seq: number): string {
    if (seq < 1000) {
        const bucket = Math.floor(seq / 10);
        return `fakeuser_shared_${bucket}@example.com`;
    }
    return `fakeuser_${seq + 1}@example.com`;
}

function buildSeedRecords(total: number, portId: string): { applications: SeedApplication[]; applicants: SeedApplicant[] } {
    const applications: SeedApplication[] = [];
    const applicants: SeedApplicant[] = [];

    for (let seq = 0; seq < total; seq++) {
        const appId = crypto.randomUUID();
        const applicantCount = pickApplicantCount(seq);
        const createdAt = linearCreatedAt(seq, total);
        const arrivalDate = new Date(createdAt);
        arrivalDate.setUTCMonth(arrivalDate.getUTCMonth() + 1);

        const visaType = pickVisaType(seq);

        applications.push({
            id: appId,
            applicationCode: buildApplicationCode(createdAt, seq),
            portId,
            contactEmail: buildEmail(seq),
            contactPhone: `+8490${String(seq + 1).padStart(7, "0")}`,
            visaType,
            visaCategory: "TOURIST",
            purposeOfVisit: "TOURIST",
            arrivalDate,
            processingTime: "NORMAL",
            applicantCount,
            totalAmount: calcTotalAmount(visaType, applicantCount),
            status: pickStatus(seq),
            createdAt,
        });

        // Mỗi đơn chỉ hiển thị 1 passport đại diện trên bảng admin
        applicants.push({
            id: crypto.randomUUID(),
            applicationId: appId,
            fullName: `Fake Applicant ${seq + 1}`,
            gender: seq % 2 === 0 ? "MALE" : "FEMALE",
            nationality: seq % 3 === 0 ? "US" : seq % 3 === 1 ? "KR" : "JP",
            dateOfBirth: new Date(1990 + (seq % 20), seq % 12, (seq % 28) + 1),
            passportNumber: `PASS${String(seq + 1).padStart(6, "0")}`,
            passportExpiryDate: new Date(2030, 0, 1),
            passportImageUrl: "https://fake.url/passport.jpg",
        });
    }

    applications.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return { applications, applicants };
}

async function main() {
    console.log(`Reseed ${TOTAL_RECORDS} fake applications (realistic distribution)...`);

    let port = await prisma.port.findFirst();
    if (!port) {
        port = await prisma.port.create({
            data: {
                id: crypto.randomUUID(),
                code: "FAKE_PORT",
                name: "Fake Port",
            },
        });
    }

    console.log("Removing old fake applications (@example.com)...");
    await prisma.applicant.deleteMany({
        where: { application: { contactEmail: { contains: "@example.com" } } },
    });
    await prisma.visaApplication.deleteMany({
        where: { contactEmail: { contains: "@example.com" } },
    });

    const remaining = await prisma.visaApplication.count();
    if (remaining === 0) {
        await prisma.$executeRawUnsafe("ALTER TABLE visa_applications AUTO_INCREMENT = 1");
        console.log("Reset sequence_no counter → 1");
    } else {
        const { _max } = await prisma.visaApplication.aggregate({ _max: { sequenceNo: true } });
        const nextSeq = (_max.sequenceNo ?? 0) + 1;
        await prisma.$executeRawUnsafe(`ALTER TABLE visa_applications AUTO_INCREMENT = ${nextSeq}`);
        console.warn(`Table còn ${remaining} đơn thật — STT fake bắt đầu từ ${nextSeq}`);
    }

    const { applications, applicants } = buildSeedRecords(TOTAL_RECORDS, port.id);

    for (let i = 0; i < applications.length; i += BATCH_SIZE) {
        const batchNo = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(applications.length / BATCH_SIZE);
        console.log(`Inserting applications batch ${batchNo}/${totalBatches}...`);

        await prisma.visaApplication.createMany({
            data: applications.slice(i, i + BATCH_SIZE),
            skipDuplicates: true,
        });
    }

    for (let i = 0; i < applicants.length; i += BATCH_SIZE) {
        const batchNo = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(applicants.length / BATCH_SIZE);
        console.log(`Inserting applicants batch ${batchNo}/${totalBatches}...`);

        await prisma.applicant.createMany({
            data: applicants.slice(i, i + BATCH_SIZE),
            skipDuplicates: true,
        });
    }

    const sample = await prisma.visaApplication.findMany({
        where: { contactEmail: { contains: "@example.com" } },
        orderBy: { sequenceNo: "desc" },
        take: 1,
        select: { sequenceNo: true, createdAt: true, status: true, visaType: true },
    });

    const oldest = await prisma.visaApplication.findMany({
        where: { contactEmail: { contains: "@example.com" } },
        orderBy: { sequenceNo: "asc" },
        take: 1,
        select: { sequenceNo: true, createdAt: true },
    });

    console.log("Seeding complete!");
    console.log(`  Newest: STT ${sample[0]?.sequenceNo}, createdAt ${sample[0]?.createdAt.toISOString()}`);
    console.log(`  Oldest: STT ${oldest[0]?.sequenceNo}, createdAt ${oldest[0]?.createdAt.toISOString()}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
