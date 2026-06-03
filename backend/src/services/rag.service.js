// src/services/rag.service.js
// RAG Service — temporarily stubbed out for stable deployment
// Re-enable after Railway is confirmed working

'use strict';

const validateConfiguration = () => {
  setImmediate(() => {
    console.log('[RAG] ⚠️  RAG service is stubbed — AI features disabled until deployment is stable');
  });
};

validateConfiguration();

const indexFile = async ({ fileName }) => {
  console.log(`[RAG] Skipping index for "${fileName}" — RAG disabled`);
  return false;
};

const removeFileIndex = async () => {};

const searchRelevantChunks = async () => [];

const chatWithRAG = async () => ({
  answer: 'AI search is being set up. Please check back soon.',
  sources: [],
});

const extractText = async () => '';

module.exports = {
  indexFile,
  removeFileIndex,
  searchRelevantChunks,
  chatWithRAG,
  extractText,
  validateConfiguration,
};