import Link from "next/link";
import SignupForm from "./signup-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SignupPage() {
  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Create an account</CardTitle>
          <CardDescription>
            You will only ever see your own data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignupForm />
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          Already have one?
          <Link href="/login" className="ml-1 underline underline-offset-4">
            Sign in
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}
