/**
 * Firestore data layer for the Resume feature (per-user, frontend-only).
 *   base resume  → users/{uid}/resumeMeta/base
 *   jobs         → users/{uid}/resumeJobs/{jobId}   (variant embedded in the job doc)
 */
import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { BaseResume, ResumeJob, ResumeVariant, JobStatus } from '../types/resume';

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function useResume() {
  const { user } = useAuth();
  const [base, setBase] = useState<BaseResume | null>(null);
  const [jobs, setJobs] = useState<ResumeJob[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setBase(null);
      setJobs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const baseSnap = await getDoc(doc(db, 'users', user.uid, 'resumeMeta', 'base'));
      setBase(baseSnap.exists() ? (baseSnap.data() as BaseResume) : null);
      const jobsSnap = await getDocs(collection(db, 'users', user.uid, 'resumeJobs'));
      const list = jobsSnap.docs.map((d) => d.data() as ResumeJob);
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setJobs(list);
    } catch (err) {
      console.error('[Resume] load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    load();
  }, [load]);

  const requireUser = () => {
    if (!user?.uid) throw new Error('Sign in to use the resume tools.');
    return user.uid;
  };

  const saveBase = useCallback(
    async (b: BaseResume) => {
      const uid = requireUser();
      await setDoc(doc(db, 'users', uid, 'resumeMeta', 'base'), b);
      setBase(b);
    },
    [user?.uid]
  );

  const addJob = useCallback(
    async (j: Omit<ResumeJob, 'id' | 'createdAt' | 'status' | 'notes' | 'appliedAt' | 'variant'>) => {
      const uid = requireUser();
      const job: ResumeJob = {
        ...j,
        id: genId(),
        status: 'saved',
        notes: '',
        appliedAt: null,
        variant: null,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', uid, 'resumeJobs', job.id), job);
      setJobs((prev) => [job, ...prev]);
      return job;
    },
    [user?.uid]
  );

  const updateJob = useCallback(
    async (id: string, patch: Partial<ResumeJob>) => {
      const uid = requireUser();
      const current = jobs.find((x) => x.id === id);
      if (!current) throw new Error('Job not found');
      const next: ResumeJob = { ...current, ...patch };
      if (patch.status === 'applied' && !current.appliedAt) next.appliedAt = new Date().toISOString();
      await setDoc(doc(db, 'users', uid, 'resumeJobs', id), next);
      setJobs((prev) => prev.map((x) => (x.id === id ? next : x)));
      return next;
    },
    [user?.uid, jobs]
  );

  const setJobStatus = useCallback((id: string, status: JobStatus) => updateJob(id, { status }), [updateJob]);
  const setJobNotes = useCallback((id: string, notes: string) => updateJob(id, { notes }), [updateJob]);
  const setJobVariant = useCallback(
    (id: string, variant: ResumeVariant) => {
      const patch: Partial<ResumeJob> = { variant };
      if (jobs.find((j) => j.id === id)?.status === 'saved') patch.status = 'tailored';
      return updateJob(id, patch);
    },
    [updateJob, jobs]
  );

  const deleteJob = useCallback(
    async (id: string) => {
      const uid = requireUser();
      await deleteDoc(doc(db, 'users', uid, 'resumeJobs', id));
      setJobs((prev) => prev.filter((x) => x.id !== id));
    },
    [user?.uid]
  );

  const getJob = useCallback((id: string) => jobs.find((x) => x.id === id) ?? null, [jobs]);

  return {
    base, jobs, loading, signedIn: !!user,
    reload: load, saveBase, addJob, updateJob, setJobStatus, setJobNotes, setJobVariant, deleteJob, getJob,
  };
}
