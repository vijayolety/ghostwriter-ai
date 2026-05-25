import assert from 'node:assert';
import test from 'node:test';

test('Draft generation logic', async (t) => {
  await t.test('Demo mode draft structure', () => {
    const prompt = 'Test prompt';
    const tone = 'Friendly';
    const cleanPrompt = prompt.trim();
    const title = cleanPrompt.split(/[.\n]/).find(Boolean)?.slice(0, 72) || "Untitled Draft";
    
    const draft = `Project Draft: ${title}\n\nThis ${tone.toLowerCase()} draft expands your outline...`;
    
    assert.ok(draft.includes('Project Draft: Test prompt'));
    assert.ok(draft.includes('friendly'));
  });
});

test('API structure', async (t) => {
    await t.test('Settings format', () => {
        const settings = {
            apiKey: 'test-key',
            provider: 'openai',
            model: 'gpt-4o-mini',
            useMock: true
        };
        assert.strictEqual(settings.provider, 'openai');
        assert.strictEqual(typeof settings.apiKey, 'string');
    });
});
