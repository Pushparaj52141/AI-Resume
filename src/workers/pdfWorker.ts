import { Worker, Job } from 'bullmq';
import { connection } from '../lib/redis-connection';
import { generatePDF } from '../lib/pdf-utils';

export const pdfWorker = new Worker(
  'pdf-generation',
  async (job: Job) => {
    const { html, fileName, options } = job.data;
    console.log(`Processing PDF generation for job ${job.id}: ${fileName}`);

    try {
      const pdfBuffer = await generatePDF(html, options);
      console.log(`PDF generated successfully for job ${job.id}`);
      
      // Return base64 string. In production, consider uploading to S3.
      const base64 = pdfBuffer.toString('base64');
      return { success: true, base64, fileName };
    } catch (error) {
      console.error(`Error generating PDF for job ${job.id}:`, error);
      throw error;
    }
  },
  { connection, concurrency: 5 }
);

pdfWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

pdfWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed with error: ${err.message}`);
});
