/**
 * OpenAPI 3.1.0 Specification Generator for CloudMeet
 * Pure TypeScript object representing complete API and Auth endpoint contracts.
 */

export interface OpenApiSpec {
	openapi: string;
	info: {
		title: string;
		description: string;
		version: string;
		contact?: { name: string; url?: string; email?: string };
		license?: { name: string; url?: string };
	};
	servers: Array<{ url: string; description: string }>;
	tags: Array<{ name: string; description: string }>;
	paths: Record<string, Record<string, unknown>>;
	components?: {
		securitySchemes?: Record<string, unknown>;
		schemas?: Record<string, unknown>;
	};
}

export function getOpenApiSpec(appUrl: string = 'https://cloudmeet.pages.dev'): OpenApiSpec {
	return {
		openapi: '3.1.0',
		info: {
			title: 'CloudMeet API',
			description: 'Open-source Calendly alternative running on Cloudflare free tier. High-performance meeting scheduler with Google Calendar, Outlook Teams, CalDAV, CardDAV, and SMTP integration.',
			version: '1.0.0',
			contact: {
				name: 'CloudMeet Project',
				url: 'https://github.com/delta-whiplash/CloudMeet'
			},
			license: {
				name: 'MIT',
				url: 'https://opensource.org/licenses/MIT'
			}
		},
		servers: [
			{
				url: appUrl,
				description: 'Production Server'
			},
			{
				url: 'http://localhost:5173',
				description: 'Local Development Server'
			}
		],
		tags: [
			{ name: 'System & Health', description: 'System health check and diagnostic probes' },
			{ name: 'Availability', description: 'Public availability query endpoints' },
			{ name: 'Event Types', description: 'Meeting event types and configurations' },
			{ name: 'Bookings', description: 'Booking creation, cancellation, and rescheduling' },
			{ name: 'Profile & Integrations', description: 'User profile, CalDAV, CardDAV, and SMTP settings' },
			{ name: 'Email Templates', description: 'Customizable email notifications and templates' },
			{ name: 'Calendars', description: 'Calendar providers and integrations' },
			{ name: 'Cron Tasks', description: 'Automated background tasks and reminder dispatching' },
			{ name: 'Authentication', description: 'Session authentication, logout, and OAuth callbacks' },
			{ name: 'Documentation', description: 'Interactive OpenAPI documentation' }
		],
		components: {
			securitySchemes: {
				cookieAuth: {
					type: 'apiKey',
					in: 'cookie',
					name: 'session',
					description: 'Session cookie token issued upon successful authentication.'
				},
				bearerAuth: {
					type: 'http',
					scheme: 'bearer',
					bearerFormat: 'Secret Key',
					description: 'Bearer authorization token for automated cron triggers.'
				}
			},
			schemas: {
				ErrorResponse: {
					type: 'object',
					properties: {
						message: { type: 'string', example: 'Invalid request data' }
					},
					required: ['message']
				},
				HealthStatus: {
					type: 'object',
					properties: {
						status: { type: 'string', example: 'ok' },
						timestamp: { type: 'string', format: 'date-time' },
						checks: {
							type: 'object',
							properties: {
								database: { type: 'boolean', example: true },
								kvCache: { type: 'boolean', example: true },
								tablesExist: { type: 'boolean', example: true }
							}
						}
					}
				},
				AvailabilitySlot: {
					type: 'object',
					properties: {
						start: { type: 'string', format: 'date-time', example: '2026-09-01T10:00:00.000Z' },
						end: { type: 'string', format: 'date-time', example: '2026-09-01T10:30:00.000Z' }
					},
					required: ['start', 'end']
				},
				BookingRequest: {
					type: 'object',
					properties: {
						eventSlug: { type: 'string', example: '30-min-meeting' },
						startTime: { type: 'string', format: 'date-time', example: '2026-09-01T10:00:00Z' },
						endTime: { type: 'string', format: 'date-time', example: '2026-09-01T10:30:00Z' },
						attendeeName: { type: 'string', example: 'Jane Doe' },
						attendeeEmail: { type: 'string', format: 'email', example: 'jane.doe@example.com' },
						notes: { type: 'string', example: 'Looking forward to our discussion.' },
						timezone: { type: 'string', example: 'UTC' },
						turnstileToken: { type: 'string', example: '0.xxxxxxx' }
					},
					required: ['eventSlug', 'startTime', 'endTime', 'attendeeName', 'attendeeEmail']
				},
				BookingResponse: {
					type: 'object',
					properties: {
						success: { type: 'boolean', example: true },
						bookingId: { type: 'string', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
						meetingUrl: { type: 'string', example: 'https://meet.google.com/abc-def-ghi' },
						meetingType: { type: 'string', enum: ['google_meet', 'teams'], example: 'google_meet' }
					}
				},
				CancellationRequest: {
					type: 'object',
					properties: {
						bookingId: { type: 'string', example: 'booking-uuid-123' },
						message: { type: 'string', example: 'Unforeseen conflict' }
					},
					required: ['bookingId']
				},
				RescheduleProposalRequest: {
					type: 'object',
					properties: {
						bookingId: { type: 'string', example: 'booking-uuid-123' },
						proposedStartTime: { type: 'string', format: 'date-time', example: '2026-09-02T14:00:00Z' },
						proposedEndTime: { type: 'string', format: 'date-time', example: '2026-09-02T14:30:00Z' },
						message: { type: 'string', example: 'Could we meet at this time instead?' }
					},
					required: ['bookingId', 'proposedStartTime', 'proposedEndTime']
				},
				UserProfile: {
					type: 'object',
					properties: {
						name: { type: 'string', example: 'Alex Host' },
						brandColor: { type: 'string', example: '#3b82f6' },
						contactEmail: { type: 'string', format: 'email', example: 'contact@example.com' },
						timeFormat: { type: 'string', enum: ['12h', '24h'], example: '24h' },
						caldavUrl: { type: 'string', example: 'https://caldav.example.com/dav/calendars/user/' },
						caldavUsername: { type: 'string', example: 'user' },
						caldavPassword: { type: 'string', example: 'secret' },
						carddavUrl: { type: 'string', example: 'https://carddav.example.com/dav/addressbooks/user/' },
						smtpHost: { type: 'string', example: 'smtp.mail.com' },
						smtpPort: { type: 'integer', example: 587 },
						smtpUsername: { type: 'string', example: 'smtpuser' },
						smtpPassword: { type: 'string', example: 'smtppass' },
						smtpSecure: { type: 'boolean', example: false },
						smtpFrom: { type: 'string', format: 'email', example: 'notifications@domain.com' }
					}
				},
				CaldavConfig: {
					type: 'object',
					properties: {
						serverUrl: { type: 'string', example: 'https://caldav.example.com/dav/calendars/user/' },
						username: { type: 'string', example: 'user@example.com' },
						password: { type: 'string', example: 'secret' },
						calendarPath: { type: 'string', example: 'personal' }
					},
					required: ['serverUrl', 'username', 'password']
				},
				SmtpConfig: {
					type: 'object',
					properties: {
						host: { type: 'string', example: 'smtp.mailtrap.io' },
						port: { type: 'integer', example: 587 },
						username: { type: 'string', example: 'user' },
						password: { type: 'string', example: 'secret' },
						secure: { type: 'boolean', example: false },
						from: { type: 'string', format: 'email', example: 'no-reply@example.com' },
						recipientEmail: { type: 'string', format: 'email', example: 'test@example.com' }
					},
					required: ['host', 'port', 'from', 'recipientEmail']
				}
			}
		},
		paths: {
			'/api/docs': {
				get: {
					tags: ['Documentation'],
					summary: 'Interactive Swagger UI Documentation',
					description: 'Renders the Swagger UI web interface for exploring and testing API endpoints. Requires authenticated admin session.',
					security: [{ cookieAuth: [] }],
					responses: {
						200: { description: 'HTML page rendering Swagger UI' },
						401: { description: 'Unauthorized - Redirects to login' }
					}
				}
			},
			'/api/openapi.json': {
				get: {
					tags: ['Documentation'],
					summary: 'Raw OpenAPI 3.1.0 JSON Schema',
					description: 'Returns the raw JSON OpenAPI specification document. Requires authenticated admin session.',
					security: [{ cookieAuth: [] }],
					responses: {
						200: {
							description: 'OpenAPI 3.1.0 JSON Document',
							content: { 'application/json': {} }
						},
						401: { description: 'Unauthorized' }
					}
				}
			},
			'/api/health': {
				get: {
					tags: ['System & Health'],
					summary: 'System Diagnostics & Health Check',
					description: 'Assesses Cloudflare D1 connection, table schemas, KV cache, and environment variables.',
					responses: {
						200: {
							description: 'Health status object',
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/HealthStatus' }
								}
							}
						}
					}
				}
			},
			'/api/availability': {
				get: {
					tags: ['Availability'],
					summary: 'Query Daily Available Time Slots',
					parameters: [
						{ name: 'event', in: 'query', required: true, schema: { type: 'string' }, description: 'Event type slug' },
						{ name: 'date', in: 'query', required: true, schema: { type: 'string', format: 'date' }, description: 'Date in YYYY-MM-DD format' }
					],
					responses: {
						200: {
							description: 'List of available time slots',
							content: {
								'application/json': {
									schema: {
										type: 'object',
										properties: {
											slots: {
												type: 'array',
												items: { $ref: '#/components/schemas/AvailabilitySlot' }
											}
										}
									}
								}
							}
						},
						400: { description: 'Missing or invalid parameters' }
					}
				}
			},
			'/api/availability/month': {
				get: {
					tags: ['Availability'],
					summary: 'Query Monthly Available Dates',
					parameters: [
						{ name: 'event', in: 'query', required: true, schema: { type: 'string' }, description: 'Event type slug' },
						{ name: 'month', in: 'query', required: true, schema: { type: 'string' }, description: 'Month in YYYY-MM format' }
					],
					responses: {
						200: {
							description: 'List of dates with available slots',
							content: {
								'application/json': {
									schema: {
										type: 'object',
										properties: {
											availableDates: { type: 'array', items: { type: 'string', format: 'date' } }
										}
									}
								}
							}
						}
					}
				}
			},
			'/api/event-type/{slug}': {
				get: {
					tags: ['Event Types'],
					summary: 'Get Public Event Type Information',
					parameters: [
						{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }
					],
					responses: {
						200: { description: 'Event type configuration' },
						404: { description: 'Event type not found' }
					}
				}
			},
			'/api/bookings': {
				post: {
					tags: ['Bookings'],
					summary: 'Create New Booking',
					description: 'Creates a new meeting booking, syncs with selected calendar (Google, Teams, or CalDAV), adds CardDAV contact, and dispatches confirmation email.',
					requestBody: {
						required: true,
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/BookingRequest' }
							}
						}
					},
					responses: {
						200: {
							description: 'Booking created successfully',
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/BookingResponse' }
								}
							}
						},
						400: { description: 'Invalid input or validation failure' },
						409: { description: 'Time slot conflict' }
					}
				}
			},
			'/api/bookings/cancel': {
				post: {
					tags: ['Bookings'],
					summary: 'Cancel Booking',
					security: [{ cookieAuth: [] }],
					requestBody: {
						required: true,
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/CancellationRequest' }
							}
						}
					},
					responses: {
						200: { description: 'Booking cancelled' },
						400: { description: 'Missing booking ID' }
					}
				}
			},
			'/api/bookings/propose-reschedule': {
				post: {
					tags: ['Bookings'],
					summary: 'Propose Reschedule Time',
					security: [{ cookieAuth: [] }],
					requestBody: {
						required: true,
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/RescheduleProposalRequest' }
							}
						}
					},
					responses: {
						200: { description: 'Reschedule proposal created' }
					}
				}
			},
			'/api/bookings/reschedule': {
				post: {
					tags: ['Bookings'],
					summary: 'Respond to Reschedule Proposal',
					requestBody: {
						required: true,
						content: {
							'application/json': {
								schema: {
									type: 'object',
									properties: {
										token: { type: 'string' },
										action: { type: 'string', enum: ['accept', 'decline'] }
									},
									required: ['token', 'action']
								}
							}
						}
					},
					responses: {
						200: { description: 'Proposal response processed' }
					}
				}
			},
			'/api/calendars/google': {
				get: {
					tags: ['Calendars'],
					summary: 'List Connected Google Calendars',
					security: [{ cookieAuth: [] }],
					responses: {
						200: { description: 'List of accessible Google calendars' },
						401: { description: 'Unauthorized' }
					}
				}
			},
			'/api/email-templates': {
				get: {
					tags: ['Email Templates'],
					summary: 'Get Custom Email Templates',
					security: [{ cookieAuth: [] }],
					responses: {
						200: { description: 'User email templates' }
					}
				},
				post: {
					tags: ['Email Templates'],
					summary: 'Save Custom Email Template',
					security: [{ cookieAuth: [] }],
					responses: {
						200: { description: 'Template updated' }
					}
				}
			},
			'/api/profile': {
				put: {
					tags: ['Profile & Integrations'],
					summary: 'Update Profile & Integration Settings',
					description: 'Updates user name, brand color, time format, contact email, CalDAV, CardDAV, and SMTP server settings.',
					security: [{ cookieAuth: [] }],
					requestBody: {
						required: true,
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/UserProfile' }
							}
						}
					},
					responses: {
						200: { description: 'Profile updated' },
						401: { description: 'Unauthorized' }
					}
				},
				post: {
					tags: ['Profile & Integrations'],
					summary: 'Upload Profile Avatar Image',
					security: [{ cookieAuth: [] }],
					responses: {
						200: { description: 'Image uploaded' }
					}
				}
			},
			'/api/integrations/test-caldav': {
				post: {
					tags: ['Profile & Integrations'],
					summary: 'Test CalDAV Server Connection',
					security: [{ cookieAuth: [] }],
					requestBody: {
						required: true,
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/CaldavConfig' }
							}
						}
					},
					responses: {
						200: { description: 'CalDAV connection successful' },
						400: { description: 'Connection failed' }
					}
				}
			},
			'/api/integrations/test-carddav': {
				post: {
					tags: ['Profile & Integrations'],
					summary: 'Test CardDAV Server Connection',
					security: [{ cookieAuth: [] }],
					requestBody: {
						required: true,
						content: {
							'application/json': {
								schema: {
									type: 'object',
									required: ['serverUrl', 'username', 'password'],
									properties: {
										serverUrl: { type: 'string', format: 'uri' },
										username: { type: 'string' },
										password: { type: 'string' },
										addressBookPath: { type: 'string' }
									}
								}
							}
						}
					},
					responses: {
						200: { description: 'CardDAV connection successful' },
						400: { description: 'Connection failed' }
					}
				}
			},
			'/api/integrations/test-smtp': {
				post: {
					tags: ['Profile & Integrations'],
					summary: 'Test SMTP Configuration & Send Email',
					security: [{ cookieAuth: [] }],
					requestBody: {
						required: true,
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/SmtpConfig' }
							}
						}
					},
					responses: {
						200: { description: 'Test email sent via SMTP' },
						400: { description: 'SMTP send failed' }
					}
				}
			},
			'/api/cron/send-reminders': {
				post: {
					tags: ['Cron Tasks'],
					summary: 'Dispatch Scheduled Reminders',
					security: [{ bearerAuth: [] }],
					responses: {
						200: { description: 'Reminders processed' },
						401: { description: 'Invalid Cron Secret' }
					}
				}
			},
			'/auth/logout': {
				post: {
					tags: ['Authentication'],
					summary: 'Logout Current Session',
					responses: {
						302: { description: 'Redirected to homepage' }
					}
				}
			},
			'/auth/callback': {
				get: {
					tags: ['Authentication'],
					summary: 'Google OAuth Callback',
					responses: {
						302: { description: 'Redirected to dashboard' }
					}
				}
			},
			'/auth/outlook': {
				get: {
					tags: ['Authentication'],
					summary: 'Initiate Microsoft Outlook OAuth Flow',
					security: [{ cookieAuth: [] }],
					responses: {
						302: { description: 'Redirected to Microsoft Authorization' }
					}
				}
			},
			'/auth/outlook/callback': {
				get: {
					tags: ['Authentication'],
					summary: 'Microsoft Outlook OAuth Callback',
					responses: {
						302: { description: 'Redirected to dashboard' }
					}
				}
			},
			'/auth/outlook/disconnect': {
				post: {
					tags: ['Authentication'],
					summary: 'Disconnect Outlook Calendar Integration',
					security: [{ cookieAuth: [] }],
					responses: {
						302: { description: 'Outlook disconnected' }
					}
				}
			}
		}
	};
}
