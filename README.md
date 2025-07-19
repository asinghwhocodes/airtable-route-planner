# Route Planner for Airtable

Plan optimal routes between multiple addresses in your Airtable data with interactive maps and route optimization.

## ☕ Support the Project

If you find this extension helpful, consider buying me a coffee to support the development!

<a href="https://www.buymeacoffee.com/asinghwhocodes" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy Me A Coffee" height="41" width="174"></a>

## Features

- **Interactive Map Display**: Visualize your route with an interactive map powered by OpenStreetMap
- **Route Optimization**: Automatically find the most efficient route order using TSP algorithms
- **Multiple Transport Modes**: Support for driving, cycling, and walking routes
- **Address Geocoding**: Automatic conversion of addresses to coordinates
- **Google Maps Integration**: Open optimized routes directly in Google Maps
- **Save to Airtable**: Save route URLs back to your Airtable records
- **Configurable Settings**: Customize default route types, address limits, and optimization preferences
- **Table Filtering**: Respects Airtable table filters to show only relevant records
- **Per-Table Configuration**: Saves field selections per table for easy switching

## 🚀 Quick Start Guide

### Prerequisites

Before you begin, make sure you have:

- **Node.js** (version 14 or higher) - [Download here](https://nodejs.org/)
- **npm** or **yarn** package manager
- **An Airtable account** with a base containing address data
- **Git** (for cloning the repository)

### Step 1: Install the Airtable CLI

First, install the Airtable CLI globally:

```bash
npm install -g @airtable/blocks-cli
```

### Step 2: Clone and Setup the Project

1. **Clone this repository**:
   ```bash
   git clone https://github.com/asinghwhocodes/airtable-route-planner.git
   cd airtable-route-planner
   ```

2. **Install project dependencies**:
   ```bash
   npm install
   ```

### Step 3: Authenticate with Airtable

1. **Create a Personal Access Token**:
   - Go to [Airtable Account](https://airtable.com/account)
   - Scroll down to "Personal access tokens"
   - Click "Create new token"
   - Give it a name (e.g., "Route Planner Development")
   - Select the scopes: `data.records:read`, `data.records:write`, `schema.bases:read`
   - Copy the generated token (you won't be able to see it again)

2. **Set the Access Token**:
   ```bash
   block set-api-key YOUR_PERSONAL_ACCESS_TOKEN
   ```
   Replace `YOUR_PERSONAL_ACCESS_TOKEN` with the token you just created.

### Step 4: Create Your Extension in Airtable

1. **Go to your Airtable base** in a web browser
2. **Navigate to Extensions** in the top menu
3. **Click "Add an extension"**
4. **Click "Build a Custom extension"**
5. **Name the extension**
6. **Click "Create extension" and skips next step if you already have blockUI installed**

Airtable will provide you with a **Base ID** and **Block ID** in format like block init baseId/blockId. Copy these - you'll need them for the next step.

### Step 5: Set Up Remote Configuration

Add the remote configuration using the IDs you just received:

1. **Open "remote.json" file from folder ".block"** 
2. **Add your baseId and BlockId there**


### Step 6: Run the Extension in Development Mode

Start the development server:

```bash
block run --remote development
```

The CLI will provide you with a URL (usually `https://localhost:9000` and copied automatically). Keep this terminal window open.

### Step 7: Import Your Extension

1. **Go back to your Airtable base**
2. **Enter the URL** provided by `block run` (e.g., `https://localhost:9000`)

The Route Planner extension should now appear in your Extensions panel!

## 📖 How to Use the Extension

### Initial Setup

1. **Open the Extension**: 
   - In your Airtable base, go to Extensions
   - Click on "Route Planner" to open the extension

2. **Select a Table**: 
   - Choose a table containing address or location data
   - The extension will automatically detect available tables

3. **Pick Location Field**: 
   - Select the column containing your addresses
   - This selection is saved per table for future use
   - Supported field types: Single line text, Long text, URL

### Planning Your First Route

1. **Choose Addresses**: 
   - Click on records to select addresses in your desired order
   - Selected addresses show with numbered badges
   - Use table filters to show only relevant records

2. **Calculate Route**: 
   - **Calculate Route**: Uses your selected order
   - **Best Route**: Automatically optimizes the route order for efficiency

3. **View Results**: 
   - See distance, duration, and number of stops
   - Interactive map shows the complete route
   - Route summary displays key metrics

4. **Open in Maps**: 
   - Click "Google Maps" to open the route in Google Maps
   - Click "Apple Maps" to open in Apple Maps (if available)

5. **Save to Airtable**: 
   - Click "Save" to store the route URL in your base
   - Choose which field to save the URL to

## 🛠️ Development Guide

### Project Structure

```
airtable-route-planner/
├── frontend/
│   ├── components/          # React components
│   │   ├── RouteMap.js     # Interactive map component
│   │   ├── SaveModal.js    # Save route modal
│   │   ├── SettingsModal.js # Settings configuration
│   │   └── Tooltip.js      # Reusable tooltip component
│   ├── services/           # API services
│   │   └── routingService.js # Route calculation and geocoding
│   ├── index.js           # Main extension entry point
│   └── style.css          # Styles and theming
├── block.json             # Extension configuration
├── package.json           # Dependencies and scripts
└── README.md             # This file
```

### Available Scripts

- `npm run dev` or `block run`: Start development server
- `npm run build` or `block build`: Build for production
- `npm run deploy` or `block deploy`: Deploy to Airtable
- `npm run lint`: Run ESLint for code quality

### Making Changes

1. **Edit the code** in the `frontend/` directory
2. **Save your changes** - the development server will automatically reload
3. **Test your changes** in the Airtable extension
4. **Repeat** until satisfied

### Building for Production

When you're ready to deploy:

1. **Build the extension**:
   ```bash
   block build
   ```

2. **Deploy to Airtable**:
   ```bash
   block deploy
   ```

This will make your extension available to install in any Airtable base.

## 🚀 Releasing Your Extension

While you're working on code, you don't want to show it off until it's ready. But at some point, it will be ready for the rest of your base collaborators to see, and then it's time to release it!

### When You're Ready to Release

1. **Build and upload your extension**:
   ```bash
   block release
   ```
   This will build your extension's code and upload it to Airtable's servers.

2. **Refresh your Airtable base** in the browser
3. **Your extension will still be there** - even if you turn off the development server!
4. **Invite collaborators** to your base and they should be able to see your extension

### Benefits of Releasing

- **Collaborators can use it**: Anyone with access to your base can use the extension
- **No development server needed**: The extension runs on Airtable's servers
- **Stable version**: Changes are only made when you explicitly release
- **Production ready**: Perfect for sharing with your team

### Making Updates

After making changes to your code:

1. **Test locally** with `block run --remote development`
2. **When satisfied**, release the updates:
   ```bash
   block release
   ```
3. **Refresh the page** to see your changes

## ⚙️ Configuration

Access settings via the settings button in the extension:

- **Default Route Type**: Choose driving, cycling, or walking
- **Maximum Addresses**: Set limit for route planning (5-20 addresses)
- **Route Optimization**: Enable/disable automatic route optimization
- **Auto Geocoding**: Enable/disable automatic address geocoding

## 🔧 Advanced Features

### Table Filtering
The extension respects your table filters, showing only filtered records for route planning.

### Field Persistence
Your location field selection is saved per table, so switching between tables maintains your preferences.

### Error Handling
Clear error messages for geocoding failures and route calculation issues.

### Loading States
Visual feedback during route calculations and geocoding operations.

## 🌐 API Services

This extension uses the following external services:

- **OpenRouteService**: For route calculation and optimization
- **Nominatim**: For address geocoding
- **OpenStreetMap**: For map tiles and data

## 🔒 Privacy & Data

- Address data is sent to geocoding services for coordinate conversion
- Route calculations are performed using OpenRouteService
- No data is stored permanently on external servers
- All processing is done in real-time
- Field selections are stored locally in your Airtable base

## 🔐 Permissions & Write-Back

### User Permissions

Users of an extension have the same permissions in the extension as they do in the Airtable base. This means that trying to perform an action that they can't do in the base (for example, deleting a record as a read-only collaborator) will throw an error.

### Writing Back to Airtable

When writing back to Airtable (to records or GlobalConfig), first check that the user has permission to perform that action. The extension includes permission checks for:

- **Saving route URLs** to record fields
- **Updating GlobalConfig** (field selections, settings)
- **Reading record data** for route planning

### Permission Requirements

- **Only users with editor or above permission** can update GlobalConfig
- **Read-only collaborators** can view routes but cannot save data
- **Field-level permissions** are respected when saving route URLs

### Development Testing

When developing the extension, you can preview it with different permission levels using the **"Advanced" tab** in the extension settings. This helps you test how the extension behaves for users with different access levels.

### Error Handling

The extension includes proper error handling for permission-related actions:
- **UI elements are disabled** when users lack required permissions
- **Clear error messages** explain why actions cannot be performed
- **Graceful degradation** ensures the extension remains functional

## 🐛 Troubleshooting

### Common Issues

1. **Extension not loading**:
   - Ensure you're using a supported browser (Chrome, Firefox, Safari, Edge)
   - Check that JavaScript is enabled
   - Verify your internet connection
   - Try refreshing the page

2. **Addresses not geocoding**:
   - Check that your address field contains valid addresses
   - Ensure addresses are in a recognizable format
   - Try using more specific addresses (include city, state)
   - Verify the address field is selected correctly

3. **Route calculation fails**:
   - Verify you have at least 2 addresses selected
   - Check that addresses are in the same region
   - Ensure you have an active internet connection
   - Try selecting fewer addresses (under 10 for best results)

4. **Field selection not saving**:
   - The extension saves field selections per table
   - Switching tables will load the saved field for that table
   - Use the "Change" button to reset field selection

5. **Development server issues**:
   - Make sure you're in the correct directory
   - Try running `npm install` again
   - Check that port 9000 is not in use
   - Restart the development server with `block run`

6. **Authentication issues**:
   - Ensure your token has the required scopes: `data.records:read`, `data.records:write`, `schema.bases:read`
   - If token is expired, create a new one and update it: `block set-api-key NEW_TOKEN`
   - Check that you're using the latest Airtable CLI version: `npm update -g @airtable/blocks-cli`
   - Verify your CLI installation: `block --version`

7. **Block ID mismatch errors**:
   - If you get "blockId mismatch" error, verify the correct block ID in your Airtable base
   - Go to Extensions → Manage extensions → Find your extension → Get the correct block ID
   - Remove the current remote: `block remove-remote development`
   - Add the correct remote: `block add-remote BASE_ID/CORRECT_BLOCK_ID development`

8. **npm install failures**:
   - Check your npm version: `npm --version` (should be 6.0.0 or higher)
   - Check your Node.js version: `node --version` (should be 14.0.0 or higher)
   - Try installing with legacy peer deps: `npm install --legacy-peer-deps`
   - Clear npm cache: `npm cache clean --force`
   - Delete node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`

9. **Permission-related errors**:
   - Ensure you have editor or above permissions in the Airtable base
   - Check that the field you're trying to save to is editable
   - Verify GlobalConfig permissions for settings and field selections
   - Test with different permission levels using the "Advanced" tab
   - Check if you're a read-only collaborator (limited functionality)

### Getting Help

If you're still having issues:

1. **Check the browser console** for error messages
2. **Verify your Airtable base** has address data
3. **Test with a simple address** like "New York, NY"
4. **Contact support** with specific error messages

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature-name`
3. **Make your changes**
4. **Run linting**: `npm run lint`
5. **Test your changes**: `block run`
6. **Submit a pull request**

### Development Guidelines

- Follow the existing code style
- Add comments for complex logic
- Test your changes thoroughly
- Update documentation if needed

## 📄 License

MIT License - see [LICENSE.md](LICENSE.md) for details

## 📝 Changelog

### v1.0.0
- Initial release
- Basic route planning functionality
- Interactive map display
- Route optimization
- Google Maps integration
- Settings configuration
- Save to Airtable functionality
- Table filtering support
- Per-table field persistence
- Improved error handling and loading states

##   Roadmap

- [ ] Support for more transport modes (public transit)

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/asinghwhocodes/airtable-route-planner/issues)
- **Email**: info@asinghwhocodes.com

---

**Happy route planning!  ✨** 
- [ ] Support for more transport modes
