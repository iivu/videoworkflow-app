import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Label,
} from '@r/ui';
import { AlertCircleIcon, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '#/providers/auth-provider';
import { normalizeApiFailedMessage } from '#/services/api';

export function LoginPage() {
  const { login, isLoginPending: isPending, loginError: error } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  function onSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    if (isPending) return;
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const account = formData.get('account') as string;
    const password = formData.get('password') as string;
    login({ username: account, password });
  }

  return (
    <section className="flex-center h-screen w-screen flex-col">
      <Alert variant="destructive" className="mb-2 max-w-sm" hidden={!error}>
        <AlertCircleIcon className="size-4" />
        <AlertTitle>错误提示</AlertTitle>
        <AlertDescription>{normalizeApiFailedMessage(error)}</AlertDescription>
      </Alert>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{import.meta.env.VITE_APP_NAME}</CardTitle>
          <CardDescription>请输入账号和密码登录</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={onSubmit} id="login-form">
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="account">账号</Label>
                <Input id="account" type="text" placeholder="请输入账号" required name="account" />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">密码</Label>
                </div>
                <InputGroup>
                  <InputGroupInput id="password" placeholder="请输入密码" type={showPassword ? 'text' : 'password'} required name="password" />
                  <InputGroupAddon align="inline-end">
                    <PasswordEyes visible={showPassword} toggle={setShowPassword} />
                  </InputGroupAddon>
                </InputGroup>
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button form="login-form" className="w-full" type="submit" disabled={isPending}>
            登录
          </Button>
        </CardFooter>
      </Card>
    </section>
  );
}

type PasswordEyesProps = {
  visible: boolean;
  toggle: (v: boolean) => void;
};
function PasswordEyes({ visible, toggle }: PasswordEyesProps) {
  return visible ? <EyeOff onClick={() => toggle(false)} /> : <Eye onClick={() => toggle(true)} />;
}
