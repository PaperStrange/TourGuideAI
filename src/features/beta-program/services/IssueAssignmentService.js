/**
 * Issue Assignment Service for Beta Program
 * Handles automated assignment of issues to team members based on issue type, 
 * severity, and team member workload/expertise.
 */

import issuePrioritizationService from './IssuePrioritizationService';

class IssueAssignmentService {
  constructor() {
    // Mock team members data (in a real app, would come from a database)
    this.teamMembers = [
      {
        id: 'user-1',
        name: 'Alex Chen',
        email: 'alex@example.com',
        role: 'Developer',
        expertise: ['frontend', 'ui', 'react'],
        availability: 0.7, // 70% available for new issues
        currentWorkload: 3, // number of current active issues
        maxIssues: 5 // maximum number of issues they can handle
      },
      {
        id: 'user-2',
        name: 'Sarah Johnson',
        email: 'sarah@example.com',
        role: 'Developer',
        expertise: ['backend', 'api', 'database'],
        availability: 0.5,
        currentWorkload: 2,
        maxIssues: 4
      },
      {
        id: 'user-3',
        name: 'Miguel Rodriguez',
        email: 'miguel@example.com',
        role: 'QA Engineer',
        expertise: ['testing', 'automation', 'ui'],
        availability: 0.9,
        currentWorkload: 1,
        maxIssues: 6
      },
      {
        id: 'user-4',
        name: 'Priya Patel',
        email: 'priya@example.com',
        role: 'Developer',
        expertise: ['mobile', 'react-native', 'authentication'],
        availability: 0.6,
        currentWorkload: 4,
        maxIssues: 5
      },
      {
        id: 'user-5',
        name: 'David Wilson',
        email: 'david@example.com',
        role: 'Tech Lead',
        expertise: ['architecture', 'performance', 'security'],
        availability: 0.4,
        currentWorkload: 3,
        maxIssues: 4
      }
    ];

    // Component-to-expertise mapping
    this.componentExpertiseMap = {
      'map': ['frontend', 'ui', 'react'],
      'authentication': ['backend', 'security', 'authentication'],
      'profile': ['frontend', 'ui', 'react'],
      'api': ['backend', 'api'],
      'chat': ['frontend', 'ui', 'react'],
      'database': ['backend', 'database'],
      'performance': ['architecture', 'performance'],
      'security': ['security', 'authentication']
    };
  }

  /**
   * Get all team members
   * @returns {Array} Array of team member objects
   */
  getTeamMembers() {
    return this.teamMembers;
  }

  /**
   * Automatically assign an issue to the most appropriate team member
   * @param {Object} issueData Issue data object
   * @returns {Object} Assignment result with assigned team member
   */
  assignIssue(issueData) {
    // Extract relevant data for assignment decision
    const severity = issueData.severity || {};
    const component = issueData.component;
    const type = issueData.type;

    // Calculate expertise match for each team member
    const candidatesWithScores = this.teamMembers.map(member => {
      let score = 0;
      
      // 1. Check expertise match with component
      if (component && this.componentExpertiseMap[component.toLowerCase()]) {
        const requiredExpertise = this.componentExpertiseMap[component.toLowerCase()];
        const expertiseMatch = member.expertise.filter(exp => 
          requiredExpertise.includes(exp)
        ).length;
        
        // Calculate expertise score (0-100)
        score += expertiseMatch * 25; // 25 points per matching expertise
      }
      
      // 2. Adjust for workload and availability
      if (member.currentWorkload < member.maxIssues) {
        // More points for team members with lower workload
        const workloadScore = ((member.maxIssues - member.currentWorkload) / member.maxIssues) * 50;
        score += workloadScore;
      } else {
        // Heavily penalize overloaded team members
        score -= 75;
      }
      
      // 3. Adjust for availability
      score += member.availability * 50;
      
      // 4. Special case: Critical issues should go to tech lead
      if (severity.value === 1 && member.role === 'Tech Lead') {
        score += 50;
      }
      
      // 5. Testing-related issues should go to QA Engineer
      if (type === 'bug' && member.role === 'QA Engineer') {
        score += 40;
      }
      
      return {
        member,
        score
      };
    });
    
    // Sort candidates by score (descending)
    candidatesWithScores.sort((a, b) => b.score - a.score);
    
    // Select the highest-scoring candidate
    const assignedTo = candidatesWithScores[0].member;
    
    // Update the team member's workload (in a real app, this would update the database)
    this.updateTeamMemberWorkload(assignedTo.id);
    
    // Return assignment result
    return {
      issue: issueData,
      assignedTo,
      score: candidatesWithScores[0].score,
      alternativeCandidates: candidatesWithScores.slice(1, 3)
        .map(c => ({ member: c.member, score: c.score })),
      assignedAt: new Date().toISOString()
    };
  }
  
  /**
   * Update a team member's workload after issue assignment
   * @param {string} memberId Team member ID
   */
  updateTeamMemberWorkload(memberId) {
    const member = this.teamMembers.find(m => m.id === memberId);
    if (member) {
      member.currentWorkload += 1;
      // In a real app, this would update the database
    }
  }
  
  /**
   * Get a team member's current workload and availability
   * @param {string} memberId Team member ID
   * @returns {Object} Workload status
   */
  getTeamMemberWorkload(memberId) {
    const member = this.teamMembers.find(m => m.id === memberId);
    if (!member) {
      throw new Error(`Team member not found: ${memberId}`);
    }
    
    return {
      currentWorkload: member.currentWorkload,
      maxIssues: member.maxIssues,
      availability: member.availability,
      isAvailable: member.currentWorkload < member.maxIssues,
      capacityPercentage: (member.currentWorkload / member.maxIssues) * 100
    };
  }
  
  /**
   * Reset a team member's workload (e.g., at the beginning of a sprint)
   * @param {string} memberId Team member ID
   */
  resetTeamMemberWorkload(memberId) {
    const member = this.teamMembers.find(m => m.id === memberId);
    if (member) {
      member.currentWorkload = 0;
      // In a real app, this would update the database
    }
  }
  
  /**
   * Recommend team members for an issue based on expertise
   * @param {string} component Issue component
   * @returns {Array} Array of recommended team members
   */
  getRecommendedAssignees(component) {
    if (!component || !this.componentExpertiseMap[component.toLowerCase()]) {
      // Return team members sorted by availability if no component match
      return this.teamMembers
        .filter(member => member.currentWorkload < member.maxIssues)
        .sort((a, b) => b.availability - a.availability);
    }
    
    const requiredExpertise = this.componentExpertiseMap[component.toLowerCase()];
    
    // Calculate expertise match and return sorted team members
    return this.teamMembers
      .map(member => {
        const expertiseMatch = member.expertise.filter(exp => 
          requiredExpertise.includes(exp)
        ).length;
        
        return {
          ...member,
          expertiseMatch
        };
      })
      .filter(member => member.currentWorkload < member.maxIssues && member.expertiseMatch > 0)
      .sort((a, b) => {
        // Sort primarily by expertise match, secondarily by availability
        if (b.expertiseMatch !== a.expertiseMatch) {
          return b.expertiseMatch - a.expertiseMatch;
        }
        return b.availability - a.availability;
      });
  }
  
  /**
   * Get workload statistics for all team members
   * @returns {Object} Team workload statistics
   */
  getTeamWorkloadStats() {
    const totalIssues = this.teamMembers.reduce((sum, member) => sum + member.currentWorkload, 0);
    const totalCapacity = this.teamMembers.reduce((sum, member) => sum + member.maxIssues, 0);
    const overloadedMembers = this.teamMembers.filter(member => 
      member.currentWorkload >= member.maxIssues
    ).length;
    
    return {
      totalIssues,
      totalCapacity,
      overallCapacityPercentage: (totalIssues / totalCapacity) * 100,
      overloadedMembers,
      teamSize: this.teamMembers.length,
      averageWorkload: totalIssues / this.teamMembers.length,
      workloadByRole: this.getWorkloadByRole()
    };
  }
  
  /**
   * Get workload statistics grouped by role
   * @returns {Object} Workload by role
   */
  getWorkloadByRole() {
    const roles = [...new Set(this.teamMembers.map(member => member.role))];
    
    return roles.map(role => {
      const membersInRole = this.teamMembers.filter(member => member.role === role);
      const totalIssues = membersInRole.reduce((sum, member) => sum + member.currentWorkload, 0);
      const totalCapacity = membersInRole.reduce((sum, member) => sum + member.maxIssues, 0);
      
      return {
        role,
        memberCount: membersInRole.length,
        totalIssues,
        totalCapacity,
        capacityPercentage: (totalIssues / totalCapacity) * 100
      };
    });
  }
}

// Create singleton instance
const issueAssignmentService = new IssueAssignmentService();

export default issueAssignmentService; 