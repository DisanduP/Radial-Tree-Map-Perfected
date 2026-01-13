# CSV to Draw.io Radial Tree Converter

A Node.js CLI tool that converts hierarchical CSV data into Draw.io XML files, which can be visualized as Radial Tree diagrams.

## Features

- Converts CSV with path-based hierarchies into radial tree structures
- Generates Draw.io compatible XML files
- Supports custom values for leaf nodes
- Easy to use CLI interface

## Installation

1. Clone or download the repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Dependencies

- `csv-parser`: For parsing CSV files
- `xmlbuilder2`: For generating XML
- `yargs`: For CLI argument parsing

## Usage

```bash
node converter.js -i <input.csv> -o <output.drawio>
```

### Options

- `-i, --input`: Input CSV file path (required)
- `-o, --output`: Output Draw.io file path (default: output.drawio)

## CSV Format

The CSV should have at least one column for paths. Optionally, a second column for values.

Example CSV:
```
Path,Value
Root,100
Root/A,50
Root/A/Sub1,25
Root/A/Sub2,25
Root/B,30
```

- **Path**: Hierarchical path separated by `/`
- **Value**: Optional numeric value for leaf nodes

## Visualization

1. Open the generated `.drawio` file in [Draw.io](https://app.diagrams.net/)
2. Select all elements (Ctrl+A)
3. Go to **Arrange** > **Layout** > **Radial**
4. The diagram will display as a sunburst chart

## Examples

Sample files included:
- `sample.csv`: Basic hierarchy
- `sample2.csv`: Knowledge base structure
- `sample3.csv`: Company org chart
- `sample4.csv`: File system hierarchy
- `sample5.csv`: Product categories

Run any sample:
```bash
node converter.js -i sample2.csv -o knowledgebase.drawio
```

## License

ISC
