/**
 * Issue Prioritization Service for Beta Program
 * Handles issue tracking, severity classification, and prioritization
 */

class IssuePrioritizationService {
  constructor() {
    // Severity levels definition
    this.severityLevels = {
      CRITICAL: {
        value: 1,
        label: 'Critical',
        description: 'Application crash, data loss, security breach, or complete feature failure',
        slaHours: 24, // Time to address critical issues in hours
        color: '#FF0000' // Red
      },
      HIGH: {
        value: 2,
        label: 'High',
        description: 'Major functionality broken, significant user impact, workaround difficult',
        slaHours: 48, // 2 days
        color: '#FF9900' // Orange
      },
      MEDIUM: {
        value: 3,
        label: 'Medium',
        description: 'Feature partially broken, moderate user impact, workaround available',
        slaHours: 96, // 4 days
        color: '#FFCC00' // Yellow
      },
      LOW: {
        value: 4,
        label: 'Low',
        description: 'Minor issues, minimal user impact, cosmetic problems',
        slaHours: 168, // 7 days
        color: '#00CC00' // Green
      },
      ENHANCEMENT: {
        value: 5,
        label: 'Enhancement',
        description: 'Feature request or improvement suggestion',
        slaHours: 336, // 14 days
        color: '#0099FF' // Blue
      }
    };
    
    // Impact assessment factors
    this.impactFactors = {
      USER_PERCENTAGE: {
        weight: 0.35, // 35% weight in scoring
        name: 'User Percentage Affected',
        description: 'Percentage of users impacted by the issue'
      },
      FREQUENCY: {
        weight: 0.25, // 25% weight
        name: 'Frequency of Occurrence',
        description: 'How often the issue occurs'
      },
      WORKAROUND: {
        weight: 0.20, // 20% weight
        name: 'Workaround Availability',
        description: 'Whether an acceptable workaround exists'
      },
      BUSINESS_IMPACT: {
        weight: 0.20, // 20% weight
        name: 'Business Impact',
        description: 'Impact on business goals or metrics'
      }
    };
  }
  
  /**
   * Get all severity levels
   * @returns {Object} Severity level definitions
   */
  getSeverityLevels() {
    return this.severityLevels;
  }
  
  /**
   * Get all impact factors
   * @returns {Object} Impact factor definitions
   */
  getImpactFactors() {
    return this.impactFactors;
  }
  
  /**
   * Classify issue severity based on impact assessment
   * @param {Object} impactData Assessment data from various factors
   * @returns {Object} Severity classification
   */
  classifyIssueSeverity(impactData) {
    // Calculate impact score (0-100)
    const score = this.calculateImpactScore(impactData);
    
    // Map score to severity level
    let severity;
    if (score >= 80) {
      severity = this.severityLevels.CRITICAL;
    } else if (score >= 60) {
      severity = this.severityLevels.HIGH;
    } else if (score >= 40) {
      severity = this.severityLevels.MEDIUM;
    } else if (score >= 20) {
      severity = this.severityLevels.LOW;
    } else {
      severity = this.severityLevels.ENHANCEMENT;
    }
    
    return {
      score,
      severity,
      slaTarget: this.calculateSLATarget(severity.slaHours),
      assessment: impactData
    };
  }
  
  /**
   * Calculate impact score based on assessment data
   * @param {Object} impactData Assessment data
   * @returns {number} Impact score (0-100)
   */
  calculateImpactScore(impactData) {
    let totalScore = 0;
    
    // User percentage impact (0-100)
    if (impactData.userPercentage !== undefined) {
      totalScore += impactData.userPercentage * this.impactFactors.USER_PERCENTAGE.weight;
    }
    
    // Frequency impact (0-100)
    // 0: Never, 25: Rarely, 50: Sometimes, 75: Often, 100: Always
    if (impactData.frequency !== undefined) {
      totalScore += impactData.frequency * this.impactFactors.FREQUENCY.weight;
    }
    
    // Workaround impact (0-100)
    // 0: Easy workaround, 50: Difficult workaround, 100: No workaround
    if (impactData.workaround !== undefined) {
      totalScore += impactData.workaround * this.impactFactors.WORKAROUND.weight;
    }
    
    // Business impact (0-100)
    // 0: No impact, 50: Moderate impact, 100: Severe impact
    if (impactData.businessImpact !== undefined) {
      totalScore += impactData.businessImpact * this.impactFactors.BUSINESS_IMPACT.weight;
    }
    
    return Math.min(Math.max(Math.round(totalScore), 0), 100);
  }
  
  /**
   * Calculate SLA target date based on severity level
   * @param {number} slaHours Hours to address based on severity
   * @returns {Date} Target resolution date
   */
  calculateSLATarget(slaHours) {
    const target = new Date();
    target.setHours(target.getHours() + slaHours);
    return target;
  }
  
  /**
   * Get priority score for sorting issues
   * @param {Object} issue Issue object
   * @returns {number} Priority score (higher = higher priority)
   */
  getPriorityScore(issue) {
    // Base score from severity (1-5, where 1 is highest priority)
    let score = 100 - (issue.severity.value * 20);
    
    // Age factor: older issues get higher priority
    const ageInHours = this.getIssueAgeInHours(issue.createdAt);
    const ageFactor = Math.min(ageInHours / 24, 10); // Cap at 10 days of age boost
    score += ageFactor * 2; // 2 points per day of age
    
    // SLA factor: issues approaching SLA get higher priority
    const timeToSlaInHours = this.getTimeToSlaInHours(issue.slaTarget);
    if (timeToSlaInHours < 0) {
      // SLA breached, high priority
      score += 30;
    } else if (timeToSlaInHours < 24) {
      // Within 24 hours of SLA breach
      score += 20;
    } else if (timeToSlaInHours < 48) {
      // Within 48 hours of SLA breach
      score += 10;
    }
    
    // Votes factor: issues with more votes get higher priority
    if (issue.votes) {
      score += Math.min(issue.votes, 50); // Cap at 50 points from votes
    }
    
    return score;
  }
  
  /**
   * Get issue age in hours
   * @param {Date|string} createdAt Issue creation date
   * @returns {number} Age in hours
   */
  getIssueAgeInHours(createdAt) {
    const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
    const now = new Date();
    return (now - created) / (1000 * 60 * 60);
  }
  
  /**
   * Get time until SLA breach in hours
   * @param {Date|string} slaTarget SLA target date
   * @returns {number} Hours until SLA breach (negative if already breached)
   */
  getTimeToSlaInHours(slaTarget) {
    const target = typeof slaTarget === 'string' ? new Date(slaTarget) : slaTarget;
    const now = new Date();
    return (target - now) / (1000 * 60 * 60);
  }
  
  /**
   * Create issue in GitHub
   * @param {Object} issueData Issue data
   * @returns {Promise<Object>} Created GitHub issue
   */
  async createGitHubIssue(issueData) {
    try {
      // In a real implementation, this would be an API call to GitHub
      // const response = await fetch('https://api.github.com/repos/owner/repo/issues', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `token ${githubToken}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({
      //     title: issueData.title,
      //     body: this.formatIssueBody(issueData),
      //     labels: this.getLabelsForIssue(issueData)
      //   })
      // });
      // return await response.json();
      
      // For demo, return mock data
      return {
        id: `github-${Date.now()}`,
        number: Math.floor(Math.random() * 1000) + 1,
        html_url: `https://github.com/tourguideai/repo/issues/${Math.floor(Math.random() * 1000) + 1}`,
        created_at: new Date().toISOString(),
        ...issueData
      };
    } catch (error) {
      console.error('Error creating GitHub issue:', error);
      throw new Error('Failed to create GitHub issue');
    }
  }
  
  /**
   * Format issue body for GitHub
   * @param {Object} issueData Issue data
   * @returns {string} Formatted issue body
   */
  formatIssueBody(issueData) {
    const severity = issueData.severity || this.severityLevels.MEDIUM;
    
    return `
## Issue Description
${issueData.description || 'No description provided'}

## Steps to Reproduce
${issueData.stepsToReproduce || 'No steps provided'}

## Expected Behavior
${issueData.expectedBehavior || 'No expected behavior provided'}

## Actual Behavior
${issueData.actualBehavior || 'No actual behavior provided'}

## Impact Assessment
- **Severity**: ${severity.label}
- **User Impact**: ${issueData.userPercentage ? `${issueData.userPercentage}% of users affected` : 'Unknown'}
- **SLA Target**: ${issueData.slaTarget ? new Date(issueData.slaTarget).toISOString() : 'Not set'}

## Additional Information
${issueData.additionalInfo || 'No additional information provided'}

---
*Generated by TourGuideAI Beta Issue Tracker*
    `.trim();
  }
  
  /**
   * Get appropriate labels for GitHub issue based on severity and type
   * @param {Object} issueData Issue data
   * @returns {Array<string>} Array of label strings
   */
  getLabelsForIssue(issueData) {
    const labels = [];
    
    // Add severity label
    if (issueData.severity) {
      labels.push(`severity:${issueData.severity.label.toLowerCase()}`);
    }
    
    // Add type label
    if (issueData.type) {
      labels.push(`type:${issueData.type.toLowerCase()}`);
    }
    
    // Add component label if available
    if (issueData.component) {
      labels.push(`component:${issueData.component.toLowerCase()}`);
    }
    
    // Add beta label
    labels.push('beta-program');
    
    return labels;
  }
  
  /**
   * Get issues from GitHub with optional filtering
   * @param {Object} filters Filter criteria
   * @returns {Promise<Array>} Array of GitHub issues
   */
  async getGitHubIssues(filters = {}) {
    try {
      // In a real implementation, this would be an API call to GitHub
      // const queryParams = new URLSearchParams();
      // if (filters.state) queryParams.append('state', filters.state);
      // if (filters.labels) queryParams.append('labels', filters.labels.join(','));
      
      // const response = await fetch(`https://api.github.com/repos/owner/repo/issues?${queryParams}`, {
      //   headers: {
      //     'Authorization': `token ${githubToken}`
      //   }
      // });
      // return await response.json();
      
      // For demo, return mock data
      return [
        {
          id: 'github-1',
          number: 42,
          title: 'Map doesn\'t load on mobile devices',
          html_url: 'https://github.com/tourguideai/repo/issues/42',
          created_at: '2023-03-15T10:22:31Z',
          severity: this.severityLevels.HIGH,
          userPercentage: 25,
          slaTarget: this.calculateSLATarget(this.severityLevels.HIGH.slaHours)
        },
        {
          id: 'github-2',
          number: 43,
          title: 'Authentication fails on slow connections',
          html_url: 'https://github.com/tourguideai/repo/issues/43',
          created_at: '2023-03-16T14:35:12Z',
          severity: this.severityLevels.CRITICAL,
          userPercentage: 15,
          slaTarget: this.calculateSLATarget(this.severityLevels.CRITICAL.slaHours)
        }
      ];
    } catch (error) {
      console.error('Error fetching GitHub issues:', error);
      throw new Error('Failed to fetch GitHub issues');
    }
  }
}

// Create singleton instance
const issuePrioritizationService = new IssuePrioritizationService();

export default issuePrioritizationService; 