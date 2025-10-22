'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { useAuth, useUser } from '@/firebase/provider';
import { getAppCheckToken } from '@/firebase/app-check';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, LockKeyhole, ChevronDown, AlertCircle, Info } from 'lucide-react';
import { isUserAdmin } from '@/lib/admin-auth';

const ensureFreshAppCheckTokenErrorCode = 'app-check/token-refresh-failed';
const ensureFreshAppCheckToken = async () => {
  if (typeof window === 'undefined') {
    return;
  }

  // In development mode, App Check is disabled - skip token check
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔓 App Check disabled in development - skipping token validation');
    return;
  }

  try {
    const token = await getAppCheckToken(true);

    if (!token) {
      const error: any = new Error('Unable to obtain Firebase App Check token.');
      error.code = ensureFreshAppCheckTokenErrorCode;
      throw error;
    }
  } catch (error: any) {
    if (!error?.code) {
      error.code = ensureFreshAppCheckTokenErrorCode;
    }
    throw error;
  }
};

export default function AdminLoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true); // Default to remember
  const [error, setError] = useState('');
  const [errorDetails, setErrorDetails] = useState<string>('');
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Redirect if already logged in as admin
  useEffect(() => {
    async function checkAdmin() {
      if (!isUserLoading && user) {
        const adminStatus = await isUserAdmin(user);
        if (adminStatus) {
          router.push('/admin/dashboard');
        }
      }
    }
    checkAdmin();
  }, [user, isUserLoading, router]);

  const setFailedState = (message: string, provider: 'password' | 'google', details?: string) => {
    setError(message);
    setErrorDetails(details || '');
    setShowErrorDetails(false); // Reset expanded state
    if (provider === 'password') {
      setIsLoading(false);
    } else {
      setIsGoogleLoading(false);
    }
  };

  const mapAuthErrorToMessage = (err: any): { message: string; details: string } => {
    // Log the full error for debugging
    console.error('=== FULL AUTH ERROR ===');
    console.error('Error code:', err?.code);
    console.error('Error message:', err?.message);
    console.error('Error stack:', err?.stack);
    console.error('Full error object:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    console.error('=======================');

    let message = '';
    let details = '';

    switch (err?.code) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        message = 'Email hoặc mật khẩu không chính xác.';
        details = `Mã lỗi: ${err?.code}`;
        break;
      case 'auth/too-many-requests':
        message = 'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 5-10 phút.';
        details = `Mã lỗi: ${err?.code}\nTài khoản tạm thời bị khóa do quá nhiều lần thử đăng nhập.`;
        break;
      case 'auth/network-request-failed':
        message = 'Không thể kết nối tới máy chủ. Kiểm tra đường truyền mạng.';
        details = `Mã lỗi: ${err?.code}\nVui lòng kiểm tra kết nối internet và thử lại.`;
        break;
      case 'auth/firebase-app-check-token-is-invalid':
        message = 'App Check token không hợp lệ. Hãy tải lại trang.';
        details = `Mã lỗi: ${err?.code}\nNguyên nhân: reCAPTCHA hoặc App Check không khởi tạo đúng.\n\nGiải pháp:\n1. Tải lại trang (Ctrl+Shift+R hoặc Cmd+Shift+R)\n2. Xóa cache và cookies\n3. Kiểm tra domain đã được thêm vào Firebase Console > App Check`;
        break;
      case 'auth/internal-error':
        message = 'Lỗi hệ thống Firebase. Thử tải lại trang.';
        details = `Mã lỗi: ${err?.code}\nChi tiết: ${err?.message || 'Không có thông tin chi tiết'}\n\nNguyên nhân có thể:\n1. App Check chưa khởi tạo đúng\n2. reCAPTCHA bị chặn\n3. Domain chưa được thêm vào Firebase Auth\n4. Lỗi cấu hình Firebase\n\nGiải pháp:\n1. Tải lại trang hoàn toàn (Ctrl+Shift+R)\n2. Kiểm tra Console logs (F12 > Console)\n3. Xóa cache trình duyệt\n4. Thử trình duyệt khác`;
        break;
      case 'auth/account-exists-with-different-credential':
        message = 'Email này đã được đăng ký với phương thức đăng nhập khác.';
        details = `Mã lỗi: ${err?.code}\nVui lòng dùng email/mật khẩu thay vì Google.`;
        break;
      case 'auth/popup-closed-by-user':
        message = 'Cửa sổ đăng nhập Google đã bị đóng.';
        details = `Mã lỗi: ${err?.code}\nVui lòng thử lại và hoàn tất đăng nhập.`;
        break;
      case 'auth/unauthorized-domain':
        message = 'Domain này chưa được phép đăng nhập.';
        details = `Mã lỗi: ${err?.code}\nDomain hiện tại chưa được thêm vào Firebase Console > Authentication > Settings > Authorized domains.\n\nCần thêm domain này: ${window.location.hostname}`;
        break;
      case ensureFreshAppCheckTokenErrorCode:
        message = 'Không thể xác thực App Check. Vui lòng tải lại trang và thử lại.';
        details = `Mã lỗi: ${err?.code}\nKhông thể làm mới App Check token trước khi đăng nhập.\n\nGiải pháp:\n1. Tải lại trang\n2. Xóa cache và cookies nếu lỗi tiếp tục\n3. Đảm bảo domain hiện tại đã được thêm vào Firebase Console > App Check > Web App`;
        break;
      default:
        message = err?.message
          ? `Không thể đăng nhập: ${err.message}`
          : 'Không thể đăng nhập lúc này. Vui lòng thử lại.';
        details = `Mã lỗi: ${err?.code || 'unknown'}\nChi tiết: ${err?.message || 'Không rõ nguyên nhân'}\n\nVui lòng:\n1. Tải lại trang\n2. Kiểm tra Console (F12)\n3. Liên hệ hỗ trợ nếu lỗi vẫn tiếp diễn`;
    }

    return { message, details };
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Set persistence based on "Remember Me" checkbox
      const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistence);
      await ensureFreshAppCheckToken();

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const adminStatus = await isUserAdmin(userCredential.user);

      if (!adminStatus) {
        setFailedState(
          'Tài khoản này không có quyền admin. Vui lòng liên hệ quản trị viên.',
          'password',
          `Email: ${userCredential.user.email}\nUID: ${userCredential.user.uid}\n\nTài khoản này không có quyền truy cập admin. Vui lòng liên hệ quản trị viên để được cấp quyền.`
        );
        await auth.signOut();
        return;
      }

      // Save email for convenience (optional)
      if (rememberMe) {
        localStorage.setItem('lastAdminEmail', email);
      }

      // Redirect to admin dashboard
      router.push('/admin/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      const errorInfo = mapAuthErrorToMessage(err);
      setFailedState(errorInfo.message, 'password', errorInfo.details);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsGoogleLoading(true);

    try {
      const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistence);
      await ensureFreshAppCheckToken();

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({prompt: 'select_account'});

      const userCredential = await signInWithPopup(auth, provider);

      const adminStatus = await isUserAdmin(userCredential.user);
      if (!adminStatus) {
        setFailedState(
          'Tài khoản Google không có quyền admin. Vui lòng liên hệ quản trị viên.',
          'google',
          `Email: ${userCredential.user.email}\nUID: ${userCredential.user.uid}\n\nTài khoản này không có quyền truy cập admin. Vui lòng liên hệ quản trị viên để được cấp quyền.`
        );
        await auth.signOut();
        return;
      }

      router.push('/admin/dashboard');
    } catch (err: any) {
      console.error('Google login error:', err);
      const errorInfo = mapAuthErrorToMessage(err);
      setFailedState(errorInfo.message, 'google', errorInfo.details);
    }
  };

  // Load saved email on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('lastAdminEmail');
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-10"></div>
      <Card className="w-full max-w-md bg-card/95 backdrop-blur-sm shadow-2xl border-primary/20 relative overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent"></div>
        <CardHeader className="space-y-1 relative">
          <div className="flex items-center justify-center mb-6">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20 animate-in spin-in-180 duration-700">
              <LockKeyhole className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-3xl text-center font-headline font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-center text-base">
            Sign in to manage your content
          </CardDescription>
        </CardHeader>
        <CardContent className="relative">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
                autoComplete="email"
                className="h-11 transition-all focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                autoComplete="current-password"
                className="h-11 transition-all focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
                disabled={isLoading}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <Label
                htmlFor="remember"
                className="text-sm font-normal cursor-pointer select-none"
              >
                Remember me for 30 days
              </Label>
            </div>
            {error && (
              <Alert variant="destructive" className="animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <AlertDescription className="text-sm font-medium">
                      {error}
                    </AlertDescription>
                    {errorDetails && (
                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() => setShowErrorDetails(!showErrorDetails)}
                          className="flex items-center gap-1 text-xs hover:underline focus:outline-none"
                        >
                          <Info className="h-3 w-3" />
                          {showErrorDetails ? 'Ẩn chi tiết' : 'Xem chi tiết lỗi'}
                          <ChevronDown
                            className={`h-3 w-3 transition-transform ${showErrorDetails ? 'rotate-180' : ''}`}
                          />
                        </button>
                        {showErrorDetails && (
                          <div className="mt-2 p-3 bg-destructive/10 rounded-md border border-destructive/20 animate-in slide-in-from-top-1 duration-200">
                            <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed">
                              {errorDetails}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Alert>
            )}
            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200"
              disabled={isLoading || isGoogleLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              {isLoading ? 'Signing in...' : 'Sign In to Dashboard'}
            </Button>
            <div className="relative">
              <div className="my-4 flex items-center justify-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                hoặc
                <span className="h-px flex-1 bg-border" />
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 text-base font-semibold"
                disabled={isLoading || isGoogleLoading}
                onClick={handleGoogleLogin}
              >
                {isGoogleLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Đang đăng nhập...
                  </>
                ) : (
                  <>
                    <svg
                      viewBox="0 0 24 24"
                      className="mr-2 h-5 w-5"
                      aria-hidden="true"
                    >
                      <path
                        fill="#4285F4"
                        d="M23.49 12.27c0-.85-.07-1.47-.22-2.11H12v3.83h6.58c-.13 1.05-.83 2.64-2.39 3.7l-.02.1 3.47 2.69.24.02c2.24-2.07 3.53-5.11 3.53-8.23"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.07 7.93-2.92l-3.78-2.93c-1.01.7-2.37 1.2-4.15 1.2-3.18 0-5.88-2.07-6.84-4.94l-.09.01-3.7 2.85-.05.09C2.99 21.53 7.13 24 12 24"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.16 14.41c-.23-.63-.37-1.31-.37-2.01 0-.7.14-1.38.36-2.01l-.01-.13-3.75-2.9-.12.06C.45 9.82 0 11.35 0 12.4c0 1.05.45 2.58 1.27 4.09l3.89-3.01"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.74c2.26 0 3.78.98 4.65 1.8l3.4-3.32C17.94 1.5 15.24 0 12 0 7.13 0 2.99 2.47 1.27 6.31l3.88 3.01c.97-2.88 3.66-4.94 6.85-4.94"
                      />
                    </svg>
                    Đăng nhập với Google
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
