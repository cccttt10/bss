module.exports = {
    './src/**/*.ts': [
        'prettier --config ./.prettierrc.json --check', 
        'eslint --no-error-on-unmatched-pattern'
    ],
    './tests/**/*.ts': [
        'prettier --config ./.prettierrc.json --check', 
        'eslint --no-error-on-unmatched-pattern'
    ]
};