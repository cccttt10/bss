# BSS

A compiler that compiles our BSS language into CSS

[The BSS language specification](https://cgao.info/bss-language-design) describes the motivation behind our language design and explains the syntax of BSS. Note that we proposed control flow in our language design. However, due to time constraints, we did not implement this feature in our compiler. Our compiler is very extensible, so future developers can add control flow feature and other additional features to it.

## Available Commands

- `npm install`: install dependencies
  
- `npm run check`: check code style, lint and TypeScript compilation
  
- `npm run fix`: fix auto-fixable code style problems
  
- `npm run build`: compile

- `npm run test`: execute tests

- `npm run test-cover`: execute tests with coverage report

- `npm run compile -- <PATH_OF_BSS_FILE_RELATIVE_TO_PROJECT_ROOT_DIR>` to compile a bss file
  
- `npm run compile-debug -- <PATH_OF_BSS_FILE_RELATIVE_TO_PROJECT_ROOT_DIR>` to compile a bss file in debug mode (tokens will be printed to the console)