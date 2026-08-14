import app from '@adonisjs/core/services/app';
import { test } from '@japa/runner';

import BusinessException from '#exceptions/business-exception';
import { PromptService } from '#services/prompt-service';
import {
  buildApiHeaders,
  buildBreakdownRequestBody,
  buildSegmentCommand,
  extractBreakdownContent,
  parseSegmentsFromText,
  requestVideoBreakdown,
  segmentFileRelativePath,
  segmentOutputPath,
  validateSegments,
} from '#services/video-breakdown-service';
import env from '#start/env';
import { createVideoBreakdownTaskValidator } from '#validators/video-breakdown';

const VALID_SEGMENTS = [
  { start: 0, end: 12.5, summary: '开场介绍' },
  { start: 12.5, end: 30, summary: '核心内容讲解' },
  { start: 30, end: 60, summary: '总结收尾' },
];

async function caught(promise: Promise<unknown>) {
  return promise.catch((error) => error);
}

test.group('Video breakdown segment validation', () => {
  test('parses a plain JSON array from LLM text', ({ assert }) => {
    assert.deepEqual(parseSegmentsFromText('[{"start":0,"end":10,"summary":"开场"}]'), [{ start: 0, end: 10, summary: '开场' }]);
  });

  test('parses a markdown-fenced JSON array', ({ assert }) => {
    assert.deepEqual(parseSegmentsFromText('```json\n[{"start":0,"end":10,"summary":"开场"}]\n```'), [{ start: 0, end: 10, summary: '开场' }]);
  });

  test('rejects non-JSON output', ({ assert }) => {
    assert.throws(() => parseSegmentsFromText('抱歉，我无法处理这个视频'), BusinessException);
  });

  test('accepts valid sorted non-overlapping segments and trims summaries', ({ assert }) => {
    assert.deepEqual(validateSegments(VALID_SEGMENTS.map((segment) => ({ ...segment, summary: `  ${segment.summary} ` }))), VALID_SEGMENTS);
  });

  test('rounds segment boundaries to millisecond precision', ({ assert }) => {
    assert.deepEqual(validateSegments([{ start: 0.1234, end: 1.5678, summary: 'x' }]), [{ start: 0.123, end: 1.568, summary: 'x' }]);
  });

  test('rejects empty or non-array results', ({ assert }) => {
    assert.throws(() => validateSegments(null), BusinessException);
    assert.throws(() => validateSegments({}), BusinessException);
    assert.throws(() => validateSegments([]), BusinessException);
  });

  test('rejects malformed segment records', ({ assert }) => {
    assert.throws(() => validateSegments(['not-an-object']), BusinessException);
  });

  test('rejects invalid start and end seconds', ({ assert }) => {
    assert.throws(() => validateSegments([{ start: -1, end: 10, summary: 'x' }]), BusinessException);
    assert.throws(() => validateSegments([{ start: '0', end: 10, summary: 'x' }]), BusinessException);
    assert.throws(() => validateSegments([{ start: 0, end: -1, summary: 'x' }]), BusinessException);
    assert.throws(() => validateSegments([{ start: 0, end: Number.NaN, summary: 'x' }]), BusinessException);
  });

  test('rejects segments whose end is not after their start', ({ assert }) => {
    assert.throws(() => validateSegments([{ start: 10, end: 10, summary: 'x' }]), BusinessException);
    assert.throws(() => validateSegments([{ start: 10, end: 5, summary: 'x' }]), BusinessException);
  });

  test('rejects empty summaries', ({ assert }) => {
    assert.throws(() => validateSegments([{ start: 0, end: 10, summary: '' }]), BusinessException);
    assert.throws(() => validateSegments([{ start: 0, end: 10, summary: '   ' }]), BusinessException);
    assert.throws(() => validateSegments([{ start: 0, end: 10, summary: 123 }]), BusinessException);
  });

  test('rejects segments not sorted by start time', ({ assert }) => {
    assert.throws(
      () =>
        validateSegments([
          { start: 10, end: 20, summary: 'a' },
          { start: 5, end: 30, summary: 'b' },
        ]),
      BusinessException,
    );
  });

  test('rejects overlapping segments', ({ assert }) => {
    assert.throws(
      () =>
        validateSegments([
          { start: 0, end: 10, summary: 'a' },
          { start: 5, end: 20, summary: 'b' },
        ]),
      BusinessException,
    );
  });
});

test.group('Video breakdown ffmpeg helpers', () => {
  test('builds the expected ffmpeg segment command', ({ assert }) => {
    assert.deepEqual(buildSegmentCommand({ videoPath: '/tmp/source-video', start: 12.5, end: 30, outputPath: '/tmp/segments/segment-002.mp4' }), [
      '-y',
      '-ss',
      '12.5',
      '-to',
      '30',
      '-i',
      '/tmp/source-video',
      '-map',
      '0:v:0',
      '-map',
      '0:a:0?',
      '-c',
      'copy',
      '/tmp/segments/segment-002.mp4',
    ]);
  });

  test('generates zero-padded segment output paths', ({ assert }) => {
    assert.equal(segmentOutputPath('/tmp/segments', 0), '/tmp/segments/segment-001.mp4');
    assert.equal(segmentOutputPath('/tmp/segments', 11), '/tmp/segments/segment-012.mp4');
  });

  test('computes a public-relative segment file path', ({ assert }) => {
    const outputPath = segmentOutputPath(app.publicPath('video-breakdown/123'), 0);
    assert.equal(segmentFileRelativePath(outputPath), 'video-breakdown/123/segment-001.mp4');
  });
});

test.group('Video breakdown LLM request', () => {
  test('builds the multimodal request body with the video URL and unified prompt', ({ assert }) => {
    const prompt = new PromptService().videoBreakdownSystemPrompt();
    const body = buildBreakdownRequestBody('https://cdn.example.com/video.mp4', 'qwen-vl-max', prompt);
    assert.equal(body.model, 'qwen-vl-max');
    assert.equal(body.messages[0].role, 'user');

    const [videoPart, textPart] = body.messages[0].content as [{ type: 'video_url'; video_url: { url: string }; fps: number }, { type: 'text'; text: string }];
    assert.deepEqual(videoPart, { type: 'video_url', video_url: { url: 'https://cdn.example.com/video.mp4' }, fps: 5 });
    assert.equal(textPart.type, 'text');
    assert.equal(textPart.text, prompt);
    assert.match(textPart.text, /JSON 数组/);
  });

  test('keeps the video breakdown prompt unified in PromptService', ({ assert }) => {
    const prompt = new PromptService().videoBreakdownSystemPrompt();
    assert.match(prompt, /200 毫秒/);
    assert.match(prompt, /精确到毫秒/);
    assert.match(prompt, /片段按开始时间升序排列/);
    assert.match(prompt, /片段之间不可重叠/);
    assert.match(prompt, /只返回 JSON 数组/);
  });

  test('builds bailian API headers', ({ assert }) => {
    assert.deepEqual(buildApiHeaders(), {
      Authorization: `Bearer ${env.get('ALIYUN_BAILIAN_KEY')}`,
      'Content-Type': 'application/json',
    });
  });

  test('extracts message content from a chat completion response', ({ assert }) => {
    assert.equal(extractBreakdownContent({ choices: [{ message: { content: '[{"start":0,"end":1,"summary":"s"}]' } }] }), '[{"start":0,"end":1,"summary":"s"}]');
    assert.throws(() => extractBreakdownContent({}), BusinessException);
    assert.throws(() => extractBreakdownContent({ choices: [] }), BusinessException);
    assert.throws(() => extractBreakdownContent({ choices: [{ message: { content: '' } }] }), BusinessException);
  });

  test('requests and validates a breakdown through the compatible-mode endpoint', async ({ assert }) => {
    const requests: Array<{ input: unknown; init?: RequestInit }> = [];
    const segments = await requestVideoBreakdown(
      {
        json: async <T>(input: unknown, init?: RequestInit) => {
          requests.push({ input, init });
          return { choices: [{ message: { content: JSON.stringify(VALID_SEGMENTS) } }] } as unknown as T;
        },
      },
      { videoUrl: 'https://cdn.example.com/video.mp4', model: 'qwen-vl-max', prompt: new PromptService().videoBreakdownSystemPrompt() },
    );

    assert.deepEqual(segments, VALID_SEGMENTS);
    assert.equal(String(requests[0].input), `${env.get('ALIYUN_BAILIAN_BASE_URL')}/compatible-mode/v1/chat/completions`);
    assert.deepEqual(requests[0].init?.headers, buildApiHeaders());
    assert.deepEqual(
      JSON.parse(String(requests[0].init?.body)),
      buildBreakdownRequestBody('https://cdn.example.com/video.mp4', 'qwen-vl-max', new PromptService().videoBreakdownSystemPrompt()),
    );
  });

  test('rejects malformed breakdown responses', async ({ assert }) => {
    const error = await caught(
      requestVideoBreakdown(
        {
          json: async <T>() => ({ choices: [{ message: { content: 'not-json' } }] }) as unknown as T,
        },
        { videoUrl: 'https://cdn.example.com/video.mp4', model: 'qwen-vl-max', prompt: new PromptService().videoBreakdownSystemPrompt() },
      ),
    );
    assert.instanceOf(error, BusinessException);
  });
});

test.group('Video breakdown validator', () => {
  test('accepts HTTPS video URLs', async ({ assert }) => {
    const parsed = await createVideoBreakdownTaskValidator.validate({ videoUrl: ' https://cdn.example.com/video.mp4 ' });
    assert.equal(parsed.videoUrl, 'https://cdn.example.com/video.mp4');
  });

  test('rejects non-HTTPS or invalid URLs', async ({ assert }) => {
    await assert.rejects(() => createVideoBreakdownTaskValidator.validate({ videoUrl: 'http://cdn.example.com/video.mp4' }));
    await assert.rejects(() => createVideoBreakdownTaskValidator.validate({ videoUrl: 'ftp://cdn.example.com/video.mp4' }));
    await assert.rejects(() => createVideoBreakdownTaskValidator.validate({ videoUrl: 'not-a-url' }));
    await assert.rejects(() => createVideoBreakdownTaskValidator.validate({}));
  });

  test('defaults to the configured model when omitted', async ({ assert }) => {
    const parsed = await createVideoBreakdownTaskValidator.validate({ videoUrl: 'https://cdn.example.com/video.mp4' });
    assert.isUndefined(parsed.model);
  });
});
