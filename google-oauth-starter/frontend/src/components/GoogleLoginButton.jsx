import { GoogleLogin } from "@react-oauth/google";
import { api } from "../services/api";

export default function GoogleLoginButton({ onAuthSuccess, onError }) {
  const handleSuccess = async (credentialResponse) => {
    try {
      const credential = credentialResponse?.credential;
      if (!credential) {
        throw new Error("Google did not return credential");
      }

      const { data } = await api.post("/auth/google", { credential });
      onAuthSuccess(data);
    } catch (error) {
      onError(error?.response?.data?.message || error.message);
    }
  };

  return (
    <GoogleLogin
      onSuccess={handleSuccess}
      onError={() => onError("Google login popup failed")}
      useOneTap={false}
      theme="outline"
      text="continue_with"
      shape="pill"
      size="large"
      width="320"
    />
  );
}
