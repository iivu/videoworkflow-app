import testUtils from '@adonisjs/core/services/test_utils';
import { test } from '@japa/runner';
import { v7 as uuidv7 } from 'uuid';

import Role from '#models/role';
import User from '#models/user';

type SessionUser = { role: { code: string; name: string; id: string } | null; roleId: string | null };

function sessionUser(response: import('@japa/api-client').ApiResponse<unknown>) {
  return (response.body() as { data: { user: SessionUser } }).data.user;
}

test.group('Roles', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction());

  test('exposes the assigned role on login', async ({ assert, client }) => {
    const role = await Role.create({
      id: uuidv7(),
      code: 'web_user',
      name: '普通用户',
      description: '普通用户',
    });
    await User.create({
      id: uuidv7(),
      username: 'roles-web-user',
      password: 'test-password',
      roleId: role.id,
    });

    const response = await client.post('/api/v1/session').json({ username: 'roles-web-user', password: 'test-password' });

    response.assertStatus(200);
    const user = sessionUser(response);
    assert.equal(user.role?.code, 'web_user');
    assert.equal(user.roleId, role.id);
  });

  test('serializes role as null when the user has no role', async ({ assert, client }) => {
    await User.create({ id: uuidv7(), username: 'roles-no-role', password: 'test-password' });

    const response = await client.post('/api/v1/session').json({ username: 'roles-no-role', password: 'test-password' });

    response.assertStatus(200);
    const user = sessionUser(response);
    assert.equal(user.role, null);
    assert.equal(user.roleId, null);
  });
});
