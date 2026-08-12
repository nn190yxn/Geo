import { BadRequestException, Injectable } from '@nestjs/common';

export type DeliveryFile = { format: 'html' | 'pdf' | 'markdown' | 'csv'; name: string; content: string; status: 'succeeded' | 'failed' };
export type DeliveryBundle = { id: string; brandId: string; reportId: string; cycleId?: string; snapshot: Record<string, unknown>; methodologyVersion: string; manifest: DeliveryFile[]; generatedAt: string };

@Injectable()
export class DeliveryBundleService {
  create(input: Omit<DeliveryBundle, 'id' | 'generatedAt' | 'manifest'> & { files: DeliveryFile[] }): DeliveryBundle {
    const successful = input.files.filter((file) => file.status === 'succeeded');
    if (!input.reportId || !input.methodologyVersion || successful.length !== input.files.length) throw new BadRequestException('delivery_bundle_incomplete');
    return { id: `bundle:${input.reportId}`, brandId: input.brandId, reportId: input.reportId, cycleId: input.cycleId, snapshot: structuredClone(input.snapshot), methodologyVersion: input.methodologyVersion, manifest: successful, generatedAt: new Date().toISOString() };
  }
  export(snapshot: Record<string, unknown>, title: string): DeliveryFile[] {
    const json = JSON.stringify(snapshot, null, 2);
    return [
      { format: 'html', name: `${title}.html`, content: `<h1>${escapeHtml(title)}</h1><pre>${escapeHtml(json)}</pre>`, status: 'succeeded' },
      { format: 'pdf', name: `${title}.pdf`, content: `PDF:${title}\n${json}`, status: 'succeeded' },
      { format: 'markdown', name: `${title}.md`, content: `# ${title}\n\n\`\`\`json\n${json}\n\`\`\``, status: 'succeeded' },
      { format: 'csv', name: `${title}.csv`, content: `field,value\nsnapshot,${JSON.stringify(json)}`, status: 'succeeded' }
    ];
  }
}
function escapeHtml(value: string) { return value.replace(/[&<>]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[character]!)); }
