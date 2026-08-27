import app from '@adonisjs/core/services/app';
import { test } from '@japa/runner';

import BusinessException from '#exceptions/business-exception';
import { PromptService } from '#services/prompt-service';
import {
  buildApiHeaders,
  buildBreakdownRequestBody,
  extractBreakdownContent,
  extractStreamBreakdownContent,
  parseSegmentsFromText,
  parseTimestamp,
  requestVideoBreakdown,
  segmentFileRelativePath,
  segmentOutputPath,
  validateSegments,
} from '#services/video-breakdown-service';
import env from '#start/env';
import { createVideoBreakdownTaskValidator } from '#validators/video-breakdown';

const VALID_SEGMENTS = [
  { start: '00:00:00.000', end: '00:00:12.500', summary: '开场介绍' },
  { start: '00:00:12.500', end: '00:00:30.000', summary: '核心内容讲解' },
  { start: '00:00:30.000', end: '00:01:00.000', summary: '总结收尾' },
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

  test('validates millisecond timestamps without converting them', ({ assert }) => {
    assert.equal(parseTimestamp('01:02:03.456'), '01:02:03.456');
    assert.isNull(parseTimestamp('1:02:03.456'));
    assert.isNull(parseTimestamp('00:60:00.000'));
    assert.isNull(parseTimestamp(1));
  });

  test('accepts valid sorted non-overlapping segments and trims summaries', ({ assert }) => {
    assert.deepEqual(validateSegments(VALID_SEGMENTS.map((segment) => ({ ...segment, summary: `  ${segment.summary} ` }))), VALID_SEGMENTS);
  });

  test('rejects empty or non-array results', ({ assert }) => {
    assert.throws(() => validateSegments(null), BusinessException);
    assert.throws(() => validateSegments({}), BusinessException);
    assert.throws(() => validateSegments([]), BusinessException);
  });

  test('rejects malformed segment records', ({ assert }) => {
    assert.throws(() => validateSegments(['not-an-object']), BusinessException);
  });

  test('rejects invalid start and end timestamps', ({ assert }) => {
    assert.throws(() => validateSegments([{ start: -1, end: '00:00:10.000', summary: 'x' }]), BusinessException);
    assert.throws(() => validateSegments([{ start: '0', end: '00:00:10.000', summary: 'x' }]), BusinessException);
    assert.throws(() => validateSegments([{ start: '00:00:00.000', end: -1, summary: 'x' }]), BusinessException);
    assert.throws(() => validateSegments([{ start: '00:00:00.000', end: '00:00:10', summary: 'x' }]), BusinessException);
  });

  test('rejects segments whose end is not after their start', ({ assert }) => {
    assert.throws(() => validateSegments([{ start: '00:00:10.000', end: '00:00:10.000', summary: 'x' }]), BusinessException);
    assert.throws(() => validateSegments([{ start: '00:00:10.000', end: '00:00:05.000', summary: 'x' }]), BusinessException);
  });

  test('rejects empty summaries', ({ assert }) => {
    assert.throws(() => validateSegments([{ start: '00:00:00.000', end: '00:00:10.000', summary: '' }]), BusinessException);
    assert.throws(() => validateSegments([{ start: '00:00:00.000', end: '00:00:10.000', summary: '   ' }]), BusinessException);
    assert.throws(() => validateSegments([{ start: '00:00:00.000', end: '00:00:10.000', summary: 123 }]), BusinessException);
  });

  test('rejects segments not sorted by start time', ({ assert }) => {
    assert.throws(
      () =>
        validateSegments([
          { start: '00:00:10.000', end: '00:00:20.000', summary: 'a' },
          { start: '00:00:05.000', end: '00:00:30.000', summary: 'b' },
        ]),
      BusinessException,
    );
  });

  test('rejects overlapping segments', ({ assert }) => {
    assert.throws(
      () =>
        validateSegments([
          { start: '00:00:00.000', end: '00:00:10.000', summary: 'a' },
          { start: '00:00:05.000', end: '00:00:20.000', summary: 'b' },
        ]),
      BusinessException,
    );
  });
});

test.group('Video breakdown file helpers', () => {
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

    const [videoPart, textPart] = body.messages[0].content as [{ type: 'video_url'; video_url: { url: string } }, { type: 'text'; text: string }];
    assert.deepEqual(videoPart, { type: 'video_url', video_url: { url: 'https://cdn.example.com/video.mp4' } });
    assert.equal(textPart.type, 'text');
    assert.equal(textPart.text, prompt);
    assert.match(textPart.text, /JSON 数组/);
  });

  test('keeps the video breakdown prompt unified in PromptService', ({ assert }) => {
    const prompt = new PromptService().videoBreakdownSystemPrompt();
    assert.match(prompt, /HH:MM:SS\.sss/);
    assert.match(prompt, /精确到毫秒/);
    assert.match(prompt, /按 start 时间升序排列/);
    assert.match(prompt, /分镜之间不得重叠/);
    assert.match(prompt, /只返回一个合法的 JSON 数组/);
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
        stream: async () => new ReadableStream(),
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

  test('requests and validates a streamed breakdown', async ({ assert }) => {
    const chunks = [
      'data: {"choices":[{"delta":{"content":"[{\\"start\\":\\"00:00:',
      '00.000\\",\\"end\\":\\"00:00:01.500\\","}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"\\"summary\\":\\"开场\\"}]"}}]}\n\n',
      'data: [DONE] \r\n\r\n',
    ];
    let requestBody: unknown;
    const segments = await requestVideoBreakdown(
      {
        json: async <T>() => null as T,
        stream: async (_input, init) => {
          requestBody = JSON.parse(String(init?.body));
          return new ReadableStream({
            start(controller) {
              const encoder = new TextEncoder();
              for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
              controller.close();
            },
          });
        },
      },
      { videoUrl: 'https://cdn.example.com/video.mp4', model: 'qwen-vl-max', prompt: 'prompt', stream: true },
    );

    assert.deepEqual(segments, [{ start: '00:00:00.000', end: '00:00:01.500', summary: '开场' }]);
    assert.deepInclude(requestBody as object, { stream: true });
  });

  test('rejects malformed streamed responses', async ({ assert }) => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: not-json\n\n'));
        controller.close();
      },
    });
    await assert.rejects(() => extractStreamBreakdownContent(stream), BusinessException);
  });

  test('rejects malformed breakdown responses', async ({ assert }) => {
    const error = await caught(
      requestVideoBreakdown(
        {
          json: async <T>() => ({ choices: [{ message: { content: 'not-json' } }] }) as unknown as T,
          stream: async () => new ReadableStream(),
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
