import { ArrowRight, BadgeCheck, LockKeyhole, Store, WifiOff } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function LoginPage() {
  return (
    <main className="app-bg min-h-screen">
      <section className="mx-auto grid min-h-screen max-w-6xl content-center gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_440px] lg:items-center lg:px-8">
        <div className="max-w-2xl">
          <div className="mb-8 flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
              <Store size={30} />
            </div>
            <div>
              <p className="text-3xl font-black tracking-tight">TokoAyu</p>
              <p className="font-semibold text-muted-foreground">Kasir warung, stok, dan hutang pelanggan</p>
            </div>
          </div>

          <Badge variant="success" className="mb-5 gap-2 px-3 py-1.5">
            <WifiOff size={16} /> Bisa dipakai saat internet putus
          </Badge>

          <h1 className="max-w-xl text-4xl font-black leading-tight tracking-tight text-foreground sm:text-5xl">
            Jualan lebih cepat, stok lebih aman.
          </h1>
          <p className="mt-5 max-w-xl text-lg font-semibold leading-8 text-muted-foreground">
            Dibuat untuk pemilik warung dan kasir. Tampilan besar, jelas, tidak banyak menu bertingkat, dan semua
            bahasa dibuat sehari-hari.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {["Kasir cepat", "Hutang rapi", "Laporan jelas"].map((item) => (
              <div key={item} className="flex min-h-14 items-center gap-2 rounded-xl border bg-card px-4 font-extrabold shadow-sm">
                <BadgeCheck size={20} className="text-primary" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <Card className="rounded-2xl shadow-soft">
          <CardHeader className="space-y-2 p-6">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-muted text-primary">
              <LockKeyhole size={26} />
            </div>
            <CardTitle className="text-2xl tracking-tight">Masuk ke TokoAyu</CardTitle>
            <p className="font-semibold text-muted-foreground">Pilih akun sesuai tugas di warung.</p>
          </CardHeader>
          <CardContent className="grid gap-4 p-6 pt-0">
            <Label className="grid gap-2">
              Nama pengguna
              <Input defaultValue="Owner" className="text-lg" />
            </Label>
            <Label className="grid gap-2">
              Password
              <Input defaultValue="123456" type="password" className="text-lg" />
            </Label>
            <Button asChild size="lg" className="mt-2 w-full rounded-xl text-lg">
              <Link href="/dashboard">
                Masuk Sekarang <ArrowRight size={22} />
              </Link>
            </Button>
            <Separator />
            <div className="grid grid-cols-3 gap-2">
              {["Owner", "Kasir", "Admin Stok"].map((role, index) => (
                <Button key={role} variant={index === 0 ? "default" : "outline"} className="min-h-12 px-2 text-sm">
                  {role}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
