/**
 * Kernel Module Center
 * Kernel Module Management, Building, and Compilation
 */
const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const logger = require('../utils/logger');

const router = express.Router();

// Multer setup for kernel modules
const upload = multer({
  dest: path.join(__dirname, '../../kernel-modules'),
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.ko') || file.originalname.endsWith('.c')) {
      cb(null, true);
    } else {
      cb(new Error('Only .ko and .c files allowed'));
    }
  }
});

// ============ MODULE MANAGEMENT ============

// GET /api/kernel/modules - List loaded kernel modules
router.get('/modules', (req, res) => {
  try {
    const lsmod = spawn('lsmod');
    let output = '';

    lsmod.stdout.on('data', (data) => {
      output += data.toString();
    });

    lsmod.on('close', () => {
      const lines = output.split('\n').slice(1);
      const modules = lines
        .filter(line => line.trim())
        .map(line => {
          const parts = line.split(/\s+/);
          return {
            name: parts[0],
            size: parts[1],
            usedBy: parts[2] || 'unused',
            dependencies: parts.slice(3).join(' ')
          };
        });

      res.json({ modules, count: modules.length });
    });

    lsmod.on('error', (err) => {
      logger.error(`Failed to start lsmod: ${err.message}`);
      res.status(500).json({ error: 'lsmod command not found or failed' });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/kernel/module-info - Get module info
router.get('/module-info', (req, res) => {
  try {
    const { module } = req.query;

    if (!module) {
      return res.status(400).json({ error: 'Module name required' });
    }

    const modinfo = spawn('modinfo', [module]);
    let output = '';

    modinfo.stdout.on('data', (data) => {
      output += data.toString();
    });

    modinfo.on('close', () => {
      res.json({ info: output });
    });

    modinfo.on('error', () => {
      res.status(404).json({ error: `Module not found: ${module}` });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/kernel/insmod - Load kernel module
router.post('/insmod', (req, res) => {
  try {
    const { module, params } = req.body;

    if (!module) {
      return res.status(400).json({ error: 'Module path required' });
    }

    logger.info(`Loading kernel module: ${module}`);

    const args = [module];
    if (params) {
      args.push(...params.split(' '));
    }

    const insmod = spawn('sudo', ['insmod', args[0], ...args.slice(1)]);
    let error = '';

    insmod.stderr.on('data', (data) => {
      error += data.toString();
    });

    insmod.on('close', (code) => {
      if (code === 0) {
        res.json({ message: 'Module loaded successfully' });
      } else {
        res.status(500).json({ error: error || 'Failed to load module' });
      }
    });

    insmod.on('error', (err) => {
      logger.error(`Failed to start insmod: ${err.message}`);
      res.status(500).json({ error: 'insmod command not found' });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/kernel/rmmod - Unload kernel module
router.post('/rmmod', (req, res) => {
  try {
    const { module } = req.body;

    if (!module) {
      return res.status(400).json({ error: 'Module name required' });
    }

    logger.info(`Unloading kernel module: ${module}`);

    const rmmod = spawn('sudo', ['rmmod', module]);
    let error = '';

    rmmod.stderr.on('data', (data) => {
      error += data.toString();
    });

    rmmod.on('close', (code) => {
      if (code === 0) {
        res.json({ message: 'Module unloaded successfully' });
      } else {
        res.status(500).json({ error: error || 'Failed to unload module' });
      }
    });

    rmmod.on('error', (err) => {
      logger.error(`Failed to start rmmod: ${err.message}`);
      res.status(500).json({ error: 'rmmod command not found' });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/kernel/upload - Upload kernel module
router.post('/upload', upload.single('module'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    logger.info(`Kernel module uploaded: ${req.file.filename}`);

    res.json({
      message: 'Module uploaded successfully',
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        path: `/kernel-modules/${req.file.filename}`
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ KERNEL LOGS ============

// GET /api/kernel/dmesg - Get kernel messages
router.get('/dmesg', (req, res) => {
  try {
    const { lines = 100 } = req.query;

    const dmesg = spawn('dmesg');
    let output = '';

    dmesg.stdout.on('data', (data) => {
      output += data.toString();
    });

    dmesg.on('close', () => {
      const allLines = output.split('\n');
      const lastLines = allLines.slice(-parseInt(lines));
      res.json({ messages: lastLines.join('\n') });
    });

    dmesg.on('error', (err) => {
      logger.error(`Failed to start dmesg: ${err.message}`);
      res.status(500).json({ error: 'dmesg command not found or failed' });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/kernel/version - Get kernel version
router.get('/version', (req, res) => {
  try {
    const uname = spawn('uname', ['-r']);
    let output = '';

    uname.stdout.on('data', (data) => {
      output += data.toString();
    });

    uname.on('close', () => {
      res.json({ version: output.trim() });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/kernel/info - Get kernel info
router.get('/info', (req, res) => {
  try {
    const uname = spawn('uname', ['-a']);
    let output = '';

    uname.stdout.on('data', (data) => {
      output += data.toString();
    });

    uname.on('close', () => {
      res.json({ info: output.trim() });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ MODULE BUILDING ============

// POST /api/kernel/build - Build kernel module from source
router.post('/build', async (req, res) => {
  try {
    const { code, moduleName = 'custom_module' } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Module code required' });
    }

    const moduleDir = path.join(__dirname, '../../kernel-modules', moduleName);
    const sourceFile = path.join(moduleDir, `${moduleName}.c`);
    const makeFile = path.join(moduleDir, 'Makefile');

    // Create directory
    await fs.mkdir(moduleDir, { recursive: true });

    // Write source file
    await fs.writeFile(sourceFile, code, 'utf-8');

    // Write Makefile — use CURDIR (set by make to its invocation dir) so M= is always correct
    const makefile = `obj-m += ${moduleName}.o

all:
\tmake -C /lib/modules/$(shell uname -r)/build M=$(CURDIR) modules

clean:
\tmake -C /lib/modules/$(shell uname -r)/build M=$(CURDIR) clean

.PHONY: all clean
`;
    await fs.writeFile(makeFile, makefile, 'utf-8');

    logger.info(`Building kernel module: ${moduleName}`);

    // Build module — run make with cwd=moduleDir so CURDIR resolves correctly
    const make = spawn('make', [], { cwd: moduleDir });
    let output = '';
    let error = '';

    make.stdout.on('data', (data) => {
      output += data.toString();
    });

    make.stderr.on('data', (data) => {
      error += data.toString();
    });

    make.on('close', async (code) => {
      if (code === 0) {
        // Check if .ko file was created
        const koFile = path.join(moduleDir, `${moduleName}.ko`);
        try {
          await fs.access(koFile);
          res.json({
            message: 'Module built successfully',
            output,
            modulePath: koFile,
            success: true
          });
        } catch {
          res.status(500).json({
            error: 'Build completed but .ko file not found',
            output,
            error
          });
        }
      } else {
        res.status(500).json({
          error: 'Build failed',
          output,
          error
        });
      }
    });

    make.on('error', (err) => {
      logger.error(`Failed to start make: ${err.message}`);
      res.status(500).json({ error: 'make command not found' });
    });

    setTimeout(() => {
      make.kill();
    }, 30000);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/kernel/compile - Compile and load module
router.post('/compile', async (req, res) => {
  try {
    const { code, moduleName = 'custom_module', autoLoad = false } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Module code required' });
    }

    const moduleDir = path.join(__dirname, '../../kernel-modules', moduleName);
    const sourceFile = path.join(moduleDir, `${moduleName}.c`);
    const makeFile = path.join(moduleDir, 'Makefile');

    // Create directory
    await fs.mkdir(moduleDir, { recursive: true });

    // Write source file
    await fs.writeFile(sourceFile, code, 'utf-8');

    // Write Makefile — use CURDIR (set by make to its invocation dir) so M= is always correct
    const makefile = `obj-m += ${moduleName}.o

all:
\tmake -C /lib/modules/$(shell uname -r)/build M=$(CURDIR) modules

clean:
\tmake -C /lib/modules/$(shell uname -r)/build M=$(CURDIR) clean

.PHONY: all clean
`;
    await fs.writeFile(makeFile, makefile, 'utf-8');

    logger.info(`Compiling kernel module: ${moduleName}`);

    // Build module — run make with cwd=moduleDir so CURDIR resolves correctly
    const make = spawn('make', [], { cwd: moduleDir });
    let buildOutput = '';
    let buildError = '';

    make.stdout.on('data', (data) => {
      buildOutput += data.toString();
    });

    make.stderr.on('data', (data) => {
      buildError += data.toString();
    });

    make.on('close', async (code) => {
      if (code === 0) {
        const koFile = path.join(moduleDir, `${moduleName}.ko`);
        
        if (autoLoad) {
          // Load module
          const insmod = spawn('sudo', ['insmod', koFile]);
          let loadError = '';

          insmod.stderr.on('data', (data) => {
            loadError += data.toString();
          });

          insmod.on('close', (loadCode) => {
            if (loadCode === 0) {
              res.json({
                message: 'Module compiled and loaded successfully',
                buildOutput,
                modulePath: koFile,
                loaded: true,
                success: true
              });
            } else {
              res.json({
                message: 'Module compiled but failed to load',
                buildOutput,
                modulePath: koFile,
                loadError,
                loaded: false,
                success: true
              });
            }
          });
        } else {
          res.json({
            message: 'Module compiled successfully',
            buildOutput,
            modulePath: koFile,
            success: true
          });
        }
      } else {
        res.status(500).json({
          error: 'Compilation failed',
          buildOutput,
          buildError
        });
      }
    });

    setTimeout(() => {
      make.kill();
    }, 30000);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/kernel/template - Get module template
router.get('/template', (req, res) => {
  const template = `#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/init.h>

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Linux Dashboard");
MODULE_DESCRIPTION("Custom Kernel Module");
MODULE_VERSION("1.0");

static int __init module_init_func(void) {
    printk(KERN_INFO "Module loaded successfully!\\n");
    return 0;
}

static void __exit module_exit_func(void) {
    printk(KERN_INFO "Module unloaded!\\n");
}

module_init(module_init_func);
module_exit(module_exit_func);
`;
  res.json({ template });
});

// GET /api/kernel/samples - List kernel sample files
router.get('/samples', async (req, res) => {
  try {
    const samplesDir = path.join(__dirname, '../../../kernel-samples');
    const files = await fs.readdir(samplesDir);
    const cFiles = files.filter(f => f.endsWith('.c'));
    const samples = await Promise.all(cFiles.map(async (file) => {
      const content = await fs.readFile(path.join(samplesDir, file), 'utf-8');
      const descMatch = content.match(/MODULE_DESCRIPTION\("([^"]+)"\)/);
      return {
        filename: file,
        name: file.replace('.c', ''),
        description: descMatch ? descMatch[1] : file,
        size: content.length,
        lines: content.split('\n').length,
      };
    }));
    res.json({ samples });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/kernel/sample/:name - Get sample source code
router.get('/sample/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const safeName = path.basename(name).replace(/[^a-zA-Z0-9_]/g, '');
    const filePath = path.join(__dirname, '../../../kernel-samples', `${safeName}.c`);
    const content = await fs.readFile(filePath, 'utf-8');
    res.json({ code: content, filename: `${safeName}.c` });
  } catch (err) {
    res.status(404).json({ error: 'Sample not found' });
  }
});

module.exports = router;
