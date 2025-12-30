/**
 * In-Memory Job Store
 *
 * Manages async flow execution jobs with bounded memory usage
 * and automatic cleanup of expired jobs.
 */

import type { FlowJob, JobStatus } from "./types";

const MAX_JOBS = 1000;
const JOB_TTL_MS = 60 * 60 * 1000; // 1 hour
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

class JobStore {
  private jobs: Map<string, FlowJob> = new Map();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Start cleanup timer (only in Node.js environment)
    if (typeof setInterval !== "undefined") {
      this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
      // Allow Node.js to exit even if timer is running
      if (this.cleanupTimer.unref) {
        this.cleanupTimer.unref();
      }
    }
  }

  /**
   * Create a new job
   */
  create(job: FlowJob): void {
    // Evict oldest job if at capacity (LRU)
    if (this.jobs.size >= MAX_JOBS) {
      const oldestKey = this.jobs.keys().next().value;
      if (oldestKey) {
        this.jobs.delete(oldestKey);
      }
    }
    this.jobs.set(job.id, job);
  }

  /**
   * Get a job by ID
   */
  get(jobId: string): FlowJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Update a job's fields
   */
  update(jobId: string, updates: Partial<FlowJob>): void {
    const job = this.jobs.get(jobId);
    if (job) {
      Object.assign(job, updates);
    }
  }

  /**
   * Update job status
   */
  setStatus(jobId: string, status: JobStatus): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = status;
      if (status === "running") {
        job.startedAt = new Date();
      } else if (status === "completed" || status === "failed") {
        job.completedAt = new Date();
      }
    }
  }

  /**
   * Mark job as completed with outputs
   */
  complete(jobId: string, outputs: Record<string, string>): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = "completed";
      job.outputs = outputs;
      job.completedAt = new Date();
    }
  }

  /**
   * Mark job as failed with errors
   */
  fail(jobId: string, errors: Record<string, string>): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = "failed";
      job.errors = errors;
      job.completedAt = new Date();
    }
  }

  /**
   * Delete a job
   */
  delete(jobId: string): void {
    this.jobs.delete(jobId);
  }

  /**
   * Cleanup expired jobs
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [id, job] of this.jobs.entries()) {
      const age = now - job.createdAt.getTime();
      if (age > JOB_TTL_MS) {
        this.jobs.delete(id);
      }
    }
  }

  /**
   * Get store stats (for debugging)
   */
  stats(): { total: number; byStatus: Record<JobStatus, number> } {
    const byStatus: Record<JobStatus, number> = {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
    };
    for (const job of this.jobs.values()) {
      byStatus[job.status]++;
    }
    return { total: this.jobs.size, byStatus };
  }
}

// Singleton instance
export const jobStore = new JobStore();
