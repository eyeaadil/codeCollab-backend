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
  console.log('Received code execution request.');
  console.log("runCodewwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww");
  const { language, code, input } = req.body;
  console.log("language", language);
  console.log("code", code);
  console.log("input", input);  

  if (!language || !code) {
    return res.status(400).json({ success: false, message: 'Language and code are required.' });
  }

  let fileExtension;
  let tempFileName = `temp_code_${Date.now()}`;
  const tempDirPath = path.join(__dirname, '../runner_temp'); 
  const filePathOnHost = path.join(tempDirPath, tempFileName);
  let commandToExecuteInContainer;
  let argsToExecuteInContainer = [];
  let postCompileCommand = null;

  console.log('Debug: tempDirPath =', tempDirPath);
  console.log('Debug: filePathOnHost =', filePathOnHost);

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
        tempFileName = 'Main'; // ✅ Ensure file will be called Main.java
        commandToExecuteInContainer = 'javac';
        argsToExecuteInContainer.push(`/app/Main.java`);
        postCompileCommand = { command: 'java', args: ['Main'] };
        break;
    case 'cpp':
      fileExtension = 'cpp';
      commandToExecuteInContainer = 'g++';
      argsToExecuteInContainer.push(`/app/${tempFileName}.cpp`, '-o', `/app/a.out`);
      postCompileCommand = { command: `/app/a.out`, args: [] };
      break;
    case 'c':
      fileExtension = 'c';
      commandToExecuteInContainer = 'gcc';
      argsToExecuteInContainer.push(`/app/${tempFileName}.c`, '-o', `/app/${tempFileName}`);
      postCompileCommand = { command: `/app/${tempFileName}`, args: [] };
      break;
    default:
      return res.status(400).json({ success: false, message: `Unsupported language: ${language}` });
  }

  const fullFilePathOnHost = `${filePathOnHost}.${fileExtension}`;
  const filePathInContainer = `/app/${tempFileName}.${fileExtension}`;

  console.log("fullFilePathOnHost", fullFilePathOnHost);
  console.log("filePathInContainer", filePathInContainer);

  try {
    await fs.writeFile(fullFilePathOnHost, code);

    const dockerImage = DOCKER_IMAGES[language];
    if (!dockerImage) {
      throw new Error(`Docker image not defined for language: ${language}`);
    }
    console.log("dockerImage", dockerImage);
    let output = '';
    let errorOutput = '';
    let exitCode = 0;

    const runDockerCommand = async (cmd, cmdArgs, mounts, containerCwd = '/app') => {
      const dockerArgs = [
        'run',
        '--rm',
        // '--network=none',
        '--memory=128m',
        '--cpus=0.5',
        '--pids-limit=64',
        '--cap-drop=ALL',
        '--security-opt=no-new-privileges',
        ...mounts.flatMap(mount => ['-v', `${mount.hostPath}:${mount.containerPath}`]),
        dockerImage,
        cmd,
        ...cmdArgs,
      ];
      console.log("dockerArgs", dockerArgs);
      return new Promise((resolve, reject) => {
        const childProcess = spawn('docker', dockerArgs, { cwd: tempDirPath });
        console.log("childProcess", childProcess);
        let stdout = '';
        let stderr = '';

        let timeoutId = setTimeout(() => {
          childProcess.kill('SIGKILL');
          reject(new Error('Execution timed out.'));
        }, 5000);

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

    // Mount the temp file and directory for compiled languages
    const mounts = [{ hostPath: fullFilePathOnHost, containerPath: filePathInContainer }];
    if (language === 'cpp' || language === 'c' || language === 'java') {
      mounts.push({ hostPath: tempDirPath, containerPath: '/app' });
    }
    console.log("mounts", mounts);

    let result;
    if (postCompileCommand) {
      const compileResult = await runDockerCommand(commandToExecuteInContainer, argsToExecuteInContainer, mounts);
      console.log('Compilation result:', compileResult);
      if (compileResult.exitCode !== 0) {
        result = { output: '', errorOutput: compileResult.stderr, exitCode: compileResult.exitCode };
      } else {
        result = await runDockerCommand(postCompileCommand.command, postCompileCommand.args, mounts);
        console.log("result", result);
      }
    } else {
      result = await runDockerCommand(commandToExecuteInContainer, argsToExecuteInContainer, mounts);
    }
    console.log("result", result);
    output = result.stdout;
    errorOutput = result.stderr;
    exitCode = result.exitCode;

    res.status(200).json({ success: true, output, error: errorOutput, exitCode });
  } catch (error) {
    console.error('Code execution error:', error);
    res.status(500).json({ success: false, message: error.message || 'An error occurred during code execution.' });
  } finally {
    // Clean up temporary files on the host
    try {
      await fs.unlink(fullFilePathOnHost);
      if (language === 'cpp') {
        await fs.unlink(path.join(tempDirPath, 'a.out')).catch(() => {});
      } else if (language === 'c') {
        await fs.unlink(path.join(tempDirPath, tempFileName)).catch(() => {});
      } else if (language === 'java') {
        await fs.unlink(path.join(tempDirPath, 'Main.class')).catch(() => {});
      }
    } catch (cleanupError) {
      console.error('Error cleaning up temp files:', cleanupError);
    }
  }
};