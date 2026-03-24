const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/OrdemServico.tsx', 'utf8');

// Inject Error Boundary class at the top
const errorBoundaryClass = `
import React from 'react';
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo });
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', backgroundColor: '#fee', color: '#c00' }}>
                    <h2>Something went wrong in OrdemServico!</h2>
                    <details style={{ whiteSpace: 'pre-wrap' }}>
                        {this.state.error && this.state.error.toString()}
                        <br />
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </details>
                </div>
            );
        }
        return this.props.children;
    }
}
`;

if (!code.includes('class ErrorBoundary')) {
    code = code.replace("export default function OrdemServicoPage() {", errorBoundaryClass + "\nexport default function OrdemServicoPage() {\n    return <ErrorBoundary><OrdemServicoContent /></ErrorBoundary>;\n}\n\nfunction OrdemServicoContent() {");
}

fs.writeFileSync('frontend/src/pages/OrdemServico.tsx', code);
console.log('Error Boundary Injected.');
