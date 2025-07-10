import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Map languages to their Docker image names
const DOCKER_IMAGES = {
  javascript: 'code-runner-nodejs',
  python: 'code-runner-python',
  java: 'code-runner-java',
  cpp: 'code-runner-cpp',
  c: 'code-runner-c',
};

export const runCode = async (req, res) => {
  const { language, code, input } = req.body;

  if (!language || !code) {
    return res.status(400).json({ success: false, message: 'Language and code are required.' });
  }

  let fileExtension;
  let tempFileName = `temp_code_${Date.now()}`;
  const tempDirPath = path.join(__dirname, '..\/temp');
  const filePathOnHost = path.join(tempDirPath, tempFileName);
  let commandToExecuteInContainer;
  let argsToExecuteInContainer = [];
  let postCompileCommand = null; // For languages that compile first (Java, C, C++)

  // Ensure temp directory exists
  await fs.mkdir(tempDirPath, { recursive: true });

  // Determine file extension and command to execute within the Docker container
  switch (language) {
    case 'javascript':
      fileExtension = 'js';
      commandToExecuteInContainer = 'node';
      argsToExecuteInContainer.push(`/app/${tempFileName}.js`);
      break;
    case 'python':
      fileExtension = 'py';
      commandToExecuteInContainer = 'python3';
      argsToExecuteInContainer.push(`/app/${tempFileName}.py`);
      break;
    case 'java':
      fileExtension = 'java';
      // Java requires compilation first, then running the class file
      const className = 'Main'; // Assuming the class is named Main
      commandToExecuteInContainer = 'javac';
      argsToExecuteInContainer.push(`/app/${tempFileName}.java`);
      postCompileCommand = { command: 'java', args: [`/app/${className}`] };
      break;
    case 'cpp':
      fileExtension = 'cpp';
      // C++ requires compilation first, then running the executable
      commandToExecuteInContainer = 'g++';
      argsToExecuteInContainer.push(`/app/${tempFileName}.cpp`, '-o', `/app/${tempFileName}`);
      postCompileCommand = { command: `/app/${tempFileName}`, args: [] };
      break;
    case 'c':
      fileExtension = 'c';
      // C requires compilation first, then running the executable
      commandToExecuteInContainer = 'gcc';
      argsToExecuteInContainer.push(`/app/${tempFileName}.c`, '-o', `/app/${tempFileName}`);
      postCompileCommand = { command: `/app/${tempFileName}`, args: [] };
      break;
    default:
      return res.status(400).json({ success: false, message: `Unsupported language: ${language}` });
  }

  const fullFilePathOnHost = `${filePathOnHost}.${fileExtension}`;
  const filePathInContainer = `/app/${tempFileName}.${fileExtension}`;

  try {
    await fs.writeFile(fullFilePathOnHost, code);

    const dockerImage = DOCKER_IMAGES[language];
    if (!dockerImage) {
      throw new Error(`Docker image not defined for language: ${language}`);
    }

    let output = '';
    let errorOutput = '';
    let exitCode = 0;

    const runDockerCommand = async (cmd, cmdArgs, mounts, containerCwd = '/app') => {
      const dockerArgs = [
        'run',
        '--rm', // Automatically remove the container when it exits
        '--network=none', // Disable network access for security
        '--memory=128m', // Limit memory to 128MB
        '--cpus=0.5', // Limit CPU usage to half a core
        '--pids-limit=64', // Limit the number of processes
        '--cap-drop=ALL', // Drop all capabilities
        '--security-opt=no-new-privileges', // Prevent privilege escalation
        ...mounts.map(mount => `-v ${mount.hostPath}:${mount.containerPath}`),
        dockerImage,
        cmd,
        ...cmdArgs,
      ];

      return new Promise((resolve, reject) => {
        const childProcess = spawn('docker', dockerArgs, { cwd: tempDirPath });

        let stdout = '';
        let stderr = '';

        let timeoutId = setTimeout(() => {
          childProcess.kill('SIGKILL'); // Force kill if timeout
          reject(new Error('Execution timed out.'));
        }, 5000); // 5 seconds timeout

        childProcess.stdout.on('data', (data) => { stdout += data.toString(); });
        childProcess.stderr.on('data', (data) => { stderr += data.toString(); });

        childProcess.on('close', (code) => {
          clearTimeout(timeoutId);
          resolve({ stdout, stderr, exitCode: code });
        });

        childProcess.on('error', (err) => {
          clearTimeout(timeoutId);
          reject(new Error(`Failed to start Docker process: ${err.message}`));
        });

        if (input) {
          childProcess.stdin.write(input);
          childProcess.stdin.end();
        }
      });
    };

    // Mount the temp file into the container
    const mounts = [{ hostPath: fullFilePathOnHost, containerPath: filePathInContainer }];
    if (language === 'java' || language === 'cpp' || language === 'c') {
      // For compiled languages, we also need to mount the output executable/class file path
      mounts.push({ hostPath: filePathOnHost, containerPath: `/app/${tempFileName}` });
    }

    let result;
    if (postCompileCommand) {
      // Step 1: Compile
      const compileResult = await runDockerCommand(commandToExecuteInContainer, argsToExecuteInContainer, mounts);
      if (compileResult.exitCode !== 0) {
        result = { output: '', errorOutput: compileResult.stderr, exitCode: compileResult.exitCode };
      } else {
        // Step 2: Run after successful compilation
        result = await runDockerCommand(postCompileCommand.command, postCompileCommand.args, mounts);
      }
    } else {
      // Run directly for interpreted languages
      result = await runDockerCommand(commandToExecuteInContainer, argsToExecuteInContainer, mounts);
    }

    output = result.output;
    errorOutput = result.errorOutput;
    exitCode = result.exitCode;

    res.status(200).json({ success: true, output, error: errorOutput, exitCode });
  } catch (error) {
    console.error('Code execution error:', error);
    res.status(500).json({ success: false, message: error.message || 'An error occurred during code execution.' });
  } finally {
    // Clean up temporary files on the host
    try {
      await fs.unlink(fullFilePathOnHost);
      // For compiled languages, the executable/class file is inside the container and removed with --rm
      // No need to explicitly unlink filePathOnHost for compiled output, as it's the directory
    } catch (cleanupError) {
      console.error('Error cleaning up temp files:', cleanupError);
    }
  }
}; 