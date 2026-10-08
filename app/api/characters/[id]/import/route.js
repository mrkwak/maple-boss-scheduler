import { context, handle, readJson } from '@/lib/server';
import { importSpecPage, UserError } from '@/lib/services/roster';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 3 * 1024 * 1024;

// 사용자가 저장한 maplescouter 페이지 파일(HTML) 가져오기
export const POST = handle(async (request, { params }) => {
  const { html } = await readJson(request);
  if (typeof html !== 'string' || !html) throw new UserError('파일 내용이 비었습니다.');
  if (html.length > MAX_BYTES) throw new UserError('파일이 너무 큽니다.');
  return importSpecPage(context().db, params.id, html);
});
