import { create } from 'zustand';
import type {
  WizardStep,
  StructuredPlan,
  SubmissionResult,
  ForkResult,
} from '@/lib/types/planner';
import type { Node, Edge } from '@xyflow/react';

interface PlannerState {
  // Wizard navigation
  step: WizardStep;
  setStep: (step: WizardStep) => void;

  // Step 1: Describe
  prompt: string;
  setPrompt: (prompt: string) => void;
  rawText: string;
  appendText: (text: string) => void;
  isStreaming: boolean;
  setIsStreaming: (streaming: boolean) => void;
  error: string;
  setError: (error: string) => void;

  // Step 2-3: Visualize + Refine
  plan: StructuredPlan | null;
  setPlan: (plan: StructuredPlan | null) => void;
  diagramNodes: Node[];
  setDiagramNodes: (nodes: Node[]) => void;
  diagramEdges: Edge[];
  setDiagramEdges: (edges: Edge[]) => void;

  // Editable fields (auto-populated from plan)
  editableTitle: string;
  setEditableTitle: (title: string) => void;
  editableDescription: string;
  setEditableDescription: (desc: string) => void;

  // GitHub config
  githubConfigured: boolean | null;
  setGithubConfigured: (configured: boolean | null) => void;

  // Step 4: Submit
  submitterName: string;
  setSubmitterName: (name: string) => void;
  submitterNotes: string;
  setSubmitterNotes: (notes: string) => void;
  isSubmitting: boolean;
  setIsSubmitting: (submitting: boolean) => void;
  submissionResult: SubmissionResult | null;
  setSubmissionResult: (result: SubmissionResult | null) => void;
  submissionError: string;
  setSubmissionError: (error: string) => void;

  // Fork
  isForkInProgress: boolean;
  setIsForkInProgress: (inProgress: boolean) => void;
  forkResult: ForkResult | null;
  setForkResult: (result: ForkResult | null) => void;
  forkError: string;
  setForkError: (error: string) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  step: 1 as WizardStep,
  prompt: '',
  rawText: '',
  isStreaming: false,
  error: '',
  plan: null,
  diagramNodes: [],
  diagramEdges: [],
  editableTitle: '',
  editableDescription: '',
  githubConfigured: null as boolean | null,
  submitterName: '',
  submitterNotes: '',
  isSubmitting: false,
  submissionResult: null,
  submissionError: '',
  isForkInProgress: false,
  forkResult: null,
  forkError: '',
};

export const usePlannerStore = create<PlannerState>((set) => ({
  ...initialState,

  setStep: (step) => set({ step }),
  setPrompt: (prompt) => set({ prompt }),
  appendText: (text) => set((s) => ({ rawText: s.rawText + text })),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  setError: (error) => set({ error }),
  setPlan: (plan) =>
    set({
      plan,
      editableTitle: plan?.meta.title ?? '',
      editableDescription:
        plan?.summary
          .replace(/^###?\s*Summary\s*\n+/i, '')
          .trim()
          .split('\n')[0] ?? '',
    }),
  setDiagramNodes: (diagramNodes) => set({ diagramNodes }),
  setDiagramEdges: (diagramEdges) => set({ diagramEdges }),
  setEditableTitle: (editableTitle) => set({ editableTitle }),
  setEditableDescription: (editableDescription) => set({ editableDescription }),
  setGithubConfigured: (githubConfigured) => set({ githubConfigured }),
  setSubmitterName: (submitterName) => set({ submitterName }),
  setSubmitterNotes: (submitterNotes) => set({ submitterNotes }),
  setIsSubmitting: (isSubmitting) => set({ isSubmitting }),
  setSubmissionResult: (submissionResult) => set({ submissionResult }),
  setSubmissionError: (submissionError) => set({ submissionError }),
  setIsForkInProgress: (isForkInProgress) => set({ isForkInProgress }),
  setForkResult: (forkResult) => set({ forkResult }),
  setForkError: (forkError) => set({ forkError }),

  reset: () => set(initialState),
}));
