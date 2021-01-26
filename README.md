# ng-async-files
emacs-ng module for async file operations 

Usage:

`M-x (ng-async-find-file FILEPATH)` 

This will open a loading screen to show progress, and will close the loading screen once the file is complete. You can include this with in your init.el:

`(eval-js "import 'https://deno.land/x/ng_async_find_file@0.1.0/mod-async-files.js';")`
