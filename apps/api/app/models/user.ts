import { type AccessToken, DbAccessTokensProvider } from '@adonisjs/auth/access_tokens';
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid';
import { compose } from '@adonisjs/core/helpers';
import hash from '@adonisjs/core/services/hash';
import { beforeCreate, belongsTo } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import { v7 as uuidv7 } from 'uuid';
import { UserSchema } from '#database/schema';
import Role from '#models/role';

const AuthFinder = withAuthFinder(hash, {
  uids: ['id', 'username'],
  passwordColumnName: 'password',
});

export default class User extends compose(UserSchema, AuthFinder) {
  static accessTokens = DbAccessTokensProvider.forModel(User);
  static selfAssignPrimaryKey = true;

  declare currentAccessToken?: AccessToken;

  @belongsTo(() => Role)
  declare role: BelongsTo<typeof Role>;

  @beforeCreate()
  static assignUUID(user: User) {
    user.id = uuidv7();
  }
}
