import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export function OtpField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex justify-center">
      <InputOTP
        maxLength={6}
        value={value}
        onChange={onChange}
        disabled={disabled}
        inputMode="numeric"
        pattern="[0-9]*"
        autoFocus
      >
        <InputOTPGroup className="gap-1.5 sm:gap-2.5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <InputOTPSlot
              key={i}
              index={i}
              className="size-11 rounded-xl border text-lg font-semibold sm:size-12"
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </div>
  );
}
