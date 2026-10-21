"use client";

import { useMemo, useState } from "react";
import {
  CalendarCheck,
  CheckCircle2,
  Loader2,
  RefreshCw,
  UserCheck,
  UserX,
  Wifi,
  WifiOff,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ATTENDANCE_DEVICE_SERIAL,
  getRiyadhDateKey,
  useAttendance,
} from "@/hooks/useAttendance";
import { useI18n } from "@/lib/i18n";

function rawValue(value) {
  return value === null || value === undefined || value === "" ? "--" : value;
}

export default function AttendancePage() {
  const { t } = useI18n();
  const [dateKey, setDateKey] = useState(() => getRiyadhDateKey());
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const { rows, device, deviceConnected, loading, error, refresh } =
    useAttendance(dateKey);

  const summary = useMemo(
    () => ({
      present: rows.filter((row) => row.attendanceStatus === "present").length,
      absent: rows.filter((row) => row.attendanceStatus === "absent").length,
    }),
    [rows],
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <CalendarCheck className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">{t.attendanceTitle}</h1>
            <p className="text-sm text-muted-foreground">
              {t.attendanceSubtitle}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Input
            type="date"
            dir="ltr"
            value={dateKey}
            onChange={(event) => {
              if (event.target.value) setDateKey(event.target.value);
            }}
            className="w-auto"
          />
          <Button variant="outline" onClick={refresh} disabled={loading}>
            <RefreshCw
              className={`w-4 h-4 me-2 ${loading ? "animate-spin" : ""}`}
            />
            {t.refresh}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">{t.present}</p>
              <p className="mt-1 text-3xl font-bold">{summary.present}</p>
            </div>
            <UserCheck className="w-9 h-9 text-green-600" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">{t.absent}</p>
              <p className="mt-1 text-3xl font-bold">{summary.absent}</p>
            </div>
            <UserX className="w-9 h-9 text-red-500" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">{t.attendanceDevice}</p>
              <p className="mt-1 font-semibold">
                {device?.model || "SenseFace 2A"}
              </p>
              <p className="text-xs text-muted-foreground" dir="ltr">
                {ATTENDANCE_DEVICE_SERIAL}
              </p>
            </div>
            <div className="flex flex-col items-center gap-1">
              {deviceConnected ? (
                <Wifi className="w-8 h-8 text-green-600" />
              ) : (
                <WifiOff className="w-8 h-8 text-muted-foreground" />
              )}
              <Badge
                variant="secondary"
                className={
                  deviceConnected
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-700"
                }>
                {deviceConnected ? t.connected : t.disconnected}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t.dailyAttendance}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <div className="p-8 text-center">
              <p className="text-destructive">{t.attendanceLoadError}</p>
              <Button variant="outline" className="mt-4" onClick={refresh}>
                <RefreshCw className="w-4 h-4 me-2" />
                {t.tryAgain}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.employee}</TableHead>
                  <TableHead>{t.firstPunch}</TableHead>
                  <TableHead>{t.lastPunch}</TableHead>
                  <TableHead>{t.numberOfPunches}</TableHead>
                  <TableHead>{t.status}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-10 text-center text-muted-foreground">
                      {t.noActiveEmployees}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow
                      key={row.id}
                      role="button"
                      tabIndex={0}
                      className="cursor-pointer"
                      onClick={() => setSelectedEmployee(row)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedEmployee(row);
                        }
                      }}>
                      <TableCell className="font-medium">
                        {row.displayName}
                      </TableCell>
                      <TableCell dir="ltr" className="text-start">
                        {row.firstPunch}
                      </TableCell>
                      <TableCell dir="ltr" className="text-start">
                        {row.lastPunch}
                      </TableCell>
                      <TableCell>{row.punchCount}</TableCell>
                      <TableCell>
                        {row.attendanceStatus === "present" ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle2 className="w-3 h-3 me-1" />
                            {t.present}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-gray-700">
                            {t.absent}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedEmployee}
        onOpenChange={(open) => !open && setSelectedEmployee(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{selectedEmployee?.displayName}</DialogTitle>
            <DialogDescription>
              {dateKey} · {t.attendanceDeviceId}: {selectedEmployee?.zkUserId || "--"}
            </DialogDescription>
          </DialogHeader>

          {selectedEmployee?.punches.length ? (
            <div className="space-y-2">
              {selectedEmployee.punches.map((punch) => (
                <div
                  key={punch.id}
                  className="flex items-center justify-between gap-4 rounded-lg border p-3">
                  <span className="font-semibold" dir="ltr">
                    {punch.eventTimeRaw?.slice(11, 19) || "--"}
                  </span>
                  <div className="text-xs text-muted-foreground text-end">
                    <div>
                      {t.rawStatus}: {rawValue(punch.status)}
                    </div>
                    <div>
                      {t.rawVerifyType}: {rawValue(punch.verifyType)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              {t.noPunches}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
