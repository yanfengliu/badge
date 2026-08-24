using System;
using System.ComponentModel;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using Microsoft.Win32.SafeHandles;

namespace Badge.Sayings {
  public static partial class BoundedChildJob {
    public static int Run(
      string application,
      string[] arguments,
      string standardInput,
      string currentDirectory) {
      if (!Path.IsPathRooted(application) || application.IndexOf('\0') >= 0 ||
          arguments == null || arguments.Length > 128 || standardInput == null ||
          standardInput.Length > 8192 || !Path.IsPathRooted(currentDirectory)) {
        throw new InvalidOperationException(
          "Bounded launch requires an absolute application and current directory, at most 128 arguments, and bounded stdin.");
      }
      foreach (string argument in arguments) {
        if (argument == null || argument.Length > 32768 || argument.IndexOf('\0') >= 0) {
          throw new InvalidOperationException("A bounded launch argument is invalid.");
        }
      }

      IntPtr job = IntPtr.Zero;
      IntPtr attributeList = IntPtr.Zero;
      IntPtr jobListValue = IntPtr.Zero;
      IntPtr childInputRead = IntPtr.Zero;
      IntPtr childInputWrite = IntPtr.Zero;
      bool attributeListInitialized = false;
      PROCESS_INFORMATION process = new PROCESS_INFORMATION();
      try {
        job = CreateJobObject(IntPtr.Zero, null);
        if (job == IntPtr.Zero) ThrowLastError("Cannot create the saying Job Object");
        JOBOBJECT_EXTENDED_LIMIT_INFORMATION limits = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
        limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        if (!SetInformationJobObject(
          job,
          JobObjectExtendedLimitInformation,
          ref limits,
          (uint)Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION)))) {
          ThrowLastError("Cannot set kill-on-close on the saying Job Object");
        }

        SECURITY_ATTRIBUTES pipeAttributes = new SECURITY_ATTRIBUTES();
        pipeAttributes.nLength = Marshal.SizeOf(typeof(SECURITY_ATTRIBUTES));
        pipeAttributes.bInheritHandle = true;
        if (!CreatePipe(out childInputRead, out childInputWrite, ref pipeAttributes, 8192)) {
          ThrowLastError("Cannot create the saying stdin pipe");
        }
        if (!SetHandleInformation(childInputWrite, HANDLE_FLAG_INHERIT, 0)) {
          ThrowLastError("Cannot make the saying stdin writer private to the launcher");
        }

        IntPtr attributeListBytes = IntPtr.Zero;
        bool sizingResult = InitializeProcThreadAttributeList(
          IntPtr.Zero,
          1,
          0,
          ref attributeListBytes);
        int sizingError = Marshal.GetLastWin32Error();
        if (sizingResult || sizingError != ERROR_INSUFFICIENT_BUFFER || attributeListBytes == IntPtr.Zero) {
          throw new Win32Exception(
            sizingError,
            "Cannot size the saying atomic Job Object attribute list");
        }
        attributeList = Marshal.AllocHGlobal(attributeListBytes);
        if (!InitializeProcThreadAttributeList(attributeList, 1, 0, ref attributeListBytes)) {
          ThrowLastError("Cannot initialize the saying atomic Job Object attribute list");
        }
        attributeListInitialized = true;
        jobListValue = Marshal.AllocHGlobal(IntPtr.Size);
        Marshal.WriteIntPtr(jobListValue, job);
        if (!UpdateProcThreadAttribute(
          attributeList,
          0,
          PROC_THREAD_ATTRIBUTE_JOB_LIST,
          jobListValue,
          new IntPtr(IntPtr.Size),
          IntPtr.Zero,
          IntPtr.Zero)) {
          ThrowLastError("Cannot bind the saying Job Object into atomic process creation");
        }

        StringBuilder commandLine = new StringBuilder(Quote(application));
        foreach (string argument in arguments) {
          commandLine.Append(' ');
          commandLine.Append(Quote(argument));
        }
        STARTUPINFOEX startup = new STARTUPINFOEX();
        startup.StartupInfo.cb = Marshal.SizeOf(typeof(STARTUPINFOEX));
        startup.StartupInfo.dwFlags = STARTF_USESTDHANDLES;
        startup.StartupInfo.hStdInput = childInputRead;
        startup.StartupInfo.hStdOutput = GetStdHandle(-11);
        startup.StartupInfo.hStdError = GetStdHandle(-12);
        startup.lpAttributeList = attributeList;
        if (!CreateProcess(
          application,
          commandLine,
          IntPtr.Zero,
          IntPtr.Zero,
          true,
          CREATE_NO_WINDOW | EXTENDED_STARTUPINFO_PRESENT,
          IntPtr.Zero,
          currentDirectory,
          ref startup,
          out process)) {
          ThrowLastError(
            "Cannot create the saying child atomically inside its Job Object");
        }

        CloseHandle(childInputRead);
        childInputRead = IntPtr.Zero;
        byte[] inputBytes = new UTF8Encoding(false, true).GetBytes(standardInput);
        using (SafeFileHandle safeInput = new SafeFileHandle(childInputWrite, false))
        using (FileStream input = new FileStream(safeInput, FileAccess.Write, 4096, false)) {
          input.Write(inputBytes, 0, inputBytes.Length);
          input.Flush();
        }
        CloseHandle(childInputWrite);
        childInputWrite = IntPtr.Zero;

        if (WaitForSingleObject(process.hProcess, INFINITE) == 0xffffffff) {
          ThrowLastError("Cannot wait for the saying child");
        }
        uint exitCode;
        if (!GetExitCodeProcess(process.hProcess, out exitCode)) {
          ThrowLastError("Cannot read the saying child's exit code");
        }
        return unchecked((int)exitCode);
      } finally {
        if (childInputRead != IntPtr.Zero) CloseHandle(childInputRead);
        if (childInputWrite != IntPtr.Zero) CloseHandle(childInputWrite);
        if (process.hThread != IntPtr.Zero) CloseHandle(process.hThread);
        if (process.hProcess != IntPtr.Zero) CloseHandle(process.hProcess);
        if (attributeListInitialized) DeleteProcThreadAttributeList(attributeList);
        if (jobListValue != IntPtr.Zero) Marshal.FreeHGlobal(jobListValue);
        if (attributeList != IntPtr.Zero) Marshal.FreeHGlobal(attributeList);
        // Closing this handle is the success-path barrier: any descendant still
        // alive after the leader exits is terminated before the wrapper exits.
        if (job != IntPtr.Zero) CloseHandle(job);
      }
    }
  }
}
