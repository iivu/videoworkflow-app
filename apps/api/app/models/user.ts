import { type AccessToken, DbAccessTokensProvider } from '@adonisjs/auth/access_tokens';
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid';
import { compose } from '@adonisjs/core/helpers';
import hash from '@adonisjs/core/services/hash';
import { beforeCreate } from '@adonisjs/lucid/orm';
import { v7 as uuidv7 } from 'uuid';
import { UserSchema } from '#database/schema';

const AuthFinder = withAuthFinder(hash, {
  uids: ['id', 'username'],
  passwordColumnName: 'password',
});

export default class User extends compose(UserSchema, AuthFinder) {
  static accessTokens = DbAccessTokensProvider.forModel(User);
  static selfAssignPrimaryKey = true;

  declare currentAccessToken?: AccessToken;

  @beforeCreate()
  static assignUUID(user: User) {
    user.id = uuidv7();
  }
}
