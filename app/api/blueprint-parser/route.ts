import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const ComplianceStatus = z.enum(['Pass', 'Review', 'Action']);

const BlueprintExtractionSchema = z.object({
  activeProjectsCount: z.number().int().nonnegative(),
  portfolioValueNaira: z.string(),
  riskExposureNaira: z.string(),
  complianceRadar: z.object({
    reviewScore: z.number().min(0).max(100),
    setbackAndCoverage: ComplianceStatus,
    fireSafetyEgress: ComplianceStatus,
    parkingProvision: ComplianceStatus,
    summary: z.string().optional(),
  }),
  billOfQuantities: z.array(
    z.object({
      scopeItem: z.string(),
      unit: z.string(),
      quantity: z.number().nonnegative(),
      ratePerUnitNaira: z.number().nonnegative(),
      state: z.enum(['Pending', 'Verified', 'Flagged']),
    })
  ),
  mepIntelligence: z.object({
    electricalDemandKva: z.number().nonnegative(),
    plumbingFlowRate: z.string(),
    hvacTonnageRequired: z.number().nonnegative(),
    status: z.enum(['Optimal', 'Review', 'Action']).default('Optimal'),
  }),
  parserMetrics: z.object({
    materialsMapped: z.number().int().nonnegative(),
    zonesDetected: z.number().int().nonnegative(),
    parseLatencySeconds: z.number().nonnegative(),
  }),
  projectNameHint: z.string().optional(),
  notes: z.array(z.string()).optional(),
});

export type BlueprintExtraction = z.infer<typeof BlueprintExtractionSchema>;

const MAX_FILE_BYTES = 50 * 1024 * 1024;

const SYSTEM_PROMPT = `You are the senior civil / structural engineer and cost-estimation agent for AJ-IBS Integrated Contractors Concept Ltd (Nigeria).

Analyse engineering drawings and produce a precise structured project intelligence object for the AJ-IBS Command Center.

Rules:
- Prefer explicit numbers, dimensions, schedules and notes on the drawing.
- When a value is missing, make a conservative professional estimate and flag it in notes.
- Compliance statuses reflect Nigerian practice and LASPPPA-style requirements (setbacks, coverage, fire egress, parking).
- Rates and values are in Nigerian Naira (₦). Use realistic Lagos / Victoria Island construction rates.
- Never invent project names or quantities that contradict the drawing.
- Output must strictly match the schema.`;

function demoExtraction(filename: string): BlueprintExtraction {
  return {
    activeProjectsCount: 12,
    portfolioValueNaira: '₦4.82B',
    riskExposureNaira: '₦186.4M',
    complianceRadar: {
      reviewScore: 92,
      setbackAndCoverage: 'Pass',
      fireSafetyEgress: 'Review',
      parkingProvision: 'Action',
      summary: 'Your design is structurally sound with a few items needing attention.',
    },
    billOfQuantities: [
      { scopeItem: 'Reinforced concrete (columns & beams)', unit: 'm³', quantity: 184, ratePerUnitNaira: 185000, state: 'Verified' },
      { scopeItem: 'Blockwork (150mm)', unit: 'm²', quantity: 1260, ratePerUnitNaira: 12500, state: 'Verified' },
      { scopeItem: 'Aluminium windows & doors', unit: 'nr', quantity: 86, ratePerUnitNaira: 145000, state: 'Pending' },
      { scopeItem: 'Floor tiles (600×600 porcelain)', unit: 'm²', quantity: 920, ratePerUnitNaira: 18500, state: 'Flagged' },
      { scopeItem: 'Electrical first fix', unit: 'sum', quantity: 1, ratePerUnitNaira: 18500000, state: 'Pending' },
    ],
    mepIntelligence: {
      electricalDemandKva: 68.4,
      plumbingFlowRate: '12.4 L/s peak',
      hvacTonnageRequired: 42,
      status: 'Optimal',
    },
    parserMetrics: {
      materialsMapped: 48,
      zonesDetected: 12,
      parseLatencySeconds: 3.2,
    },
    projectNameHint: filename.includes('Lekki')
      ? 'Lekki Waterfront Residences · Block A'
      : 'Victoria Island HQ – Sample Drawing Set',
    notes: [
      'Demo mode – realistic sample extraction. Connect GOOGLE_GENERATIVE_AI_API_KEY for live Gemini vision.',
      'Parking provision requires action (ratio below LASPPPA minimum for residential).',
      'Fire safety egress paths need review on Level 2.',
    ],
  };
}

function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ success: false, error: message, ...extra }, { status });
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const started = performance.now();

  try {
    const contentType = req.headers.get('content-type') || '';
    let fileBuffer: Buffer | null = null;
    let mimeType = 'application/pdf';
    let filename = 'blueprint.pdf';

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file') as File | null;
      if (file) {
        if (file.size > MAX_FILE_BYTES) {
          return jsonError(`File exceeds ${MAX_FILE_BYTES / 1024 / 1024} MB limit`, 413);
        }
        mimeType = file.type || 'application/pdf';
        filename = file.name || filename;
        fileBuffer = Buffer.from(await file.arrayBuffer());
      }
    } else {
      const body = await req.json().catch(() => ({}));
      if (body.fileBase64 && body.mimeType) {
        fileBuffer = Buffer.from(body.fileBase64, 'base64');
        mimeType = body.mimeType;
        filename = body.filename || filename;
      }
    }

    const hasKey = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!hasKey) {
      await new Promise((r) => setTimeout(r, 1800 + Math.random() * 1200));
      const data = demoExtraction(filename);
      const elapsed = Number(((performance.now() - started) / 1000).toFixed(2));
      data.parserMetrics.parseLatencySeconds = elapsed;

      return NextResponse.json({
        success: true,
        requestId,
        mode: 'demo',
        data,
        meta: {
          model: 'demo-simulator',
          elapsedSeconds: elapsed,
          fileBytes: fileBuffer?.byteLength ?? 0,
          mimeType,
          note: 'Running in demo mode. Add GOOGLE_GENERATIVE_AI_API_KEY in Vercel env for live Gemini extraction.',
        },
      });
    }

    if (!fileBuffer) {
      return jsonError('Upload a file (PDF / image) to analyse.');
    }

    const model = google('gemini-2.5-flash');

    const { object, usage, finishReason } = await generateObject({
      model,
      schema: BlueprintExtractionSchema,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyse this engineering blueprint for AJ-IBS Command Center.\nFilename: ${filename}\nProduce the full structured extraction.`,
            },
            {
              type: 'file',
              data: fileBuffer,
              mediaType: mimeType,
            },
          ],
        },
      ],
      temperature: 0.2,
    });

    const elapsedSec = Number(((performance.now() - started) / 1000).toFixed(2));
    object.parserMetrics.parseLatencySeconds = elapsedSec;

    return NextResponse.json({
      success: true,
      requestId,
      mode: 'live',
      data: object,
      meta: {
        model: 'gemini-2.5-flash',
        finishReason,
        usage,
        elapsedSeconds: elapsedSec,
        fileBytes: fileBuffer.byteLength,
        mimeType,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown extraction failure';
    console.error(`[blueprint-parser] ${requestId}`, err);

    const data = demoExtraction('fallback.pdf');
    const elapsed = Number(((performance.now() - started) / 1000).toFixed(2));
    data.parserMetrics.parseLatencySeconds = elapsed;
    data.notes = [
      ...(data.notes || []),
      `Live model error: ${message}. Showing demo extraction instead.`,
    ];

    return NextResponse.json({
      success: true,
      requestId,
      mode: 'demo-fallback',
      data,
      meta: {
        model: 'demo-fallback',
        elapsedSeconds: elapsed,
        originalError: message,
      },
    });
  }
}
